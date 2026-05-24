import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyPaymentSignature, getRazorpay } from "@/lib/razorpay";
import { commissionCalc, formatPrice } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { createNotifications } from "@/lib/notifications";

export const runtime = "nodejs";

/**
 * Verifies a Razorpay payment and finalizes the purchase.
 *
 * Razorpay's success callback hands the browser three values:
 *   - razorpay_order_id
 *   - razorpay_payment_id
 *   - razorpay_signature  (HMAC-SHA256 of `${order_id}|${payment_id}` using key_secret)
 *
 * The client posts those back here. We re-compute the HMAC server-side
 * and only credit the creator if the signature matches — this is the
 * sole proof that the payment actually completed on Razorpay's end.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Throttle verification attempts — a forged-signature brute force gets
  // nowhere cryptographically, but rate-limiting keeps the DB lookups cheap.
  const rl = checkRateLimit(req, "verify-payment", {
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const {
    assetId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = (body ?? {}) as {
    assetId?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };

  if (
    !assetId ||
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature
  ) {
    return NextResponse.json(
      { error: "Missing payment verification fields." },
      { status: 400 }
    );
  }

  const valid = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid payment signature." },
      { status: 400 }
    );
  }

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      title: true,
      price: true,
      status: true,
      uploaderId: true,
    },
  });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }
  if (asset.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Asset is no longer available." },
      { status: 400 }
    );
  }

  // ─── Authoritative cross-check with Razorpay ──────────────────────────────
  // The HMAC signature proves the response was minted by Razorpay, but it
  // ONLY binds order_id + payment_id — not the asset, amount, or buyer.
  // A malicious client could pair a cheap real payment with the assetId of an
  // expensive asset in this request body and get the expensive asset credited.
  //
  // To close that gap we re-fetch the order from Razorpay (whose response we
  // trust because it comes from an authenticated API call with our secret)
  // and confirm every field matches: the asset bought, the amount actually
  // charged, the buyer who signed in, and that the order is in the `paid`
  // state. Any mismatch → reject and never credit anyone.
  let order: {
    amount: number | string;
    status: string;
    notes?: Record<string, unknown> | null;
  };
  try {
    order = (await getRazorpay().orders.fetch(razorpay_order_id)) as never;
  } catch (err) {
    console.error("[verify-payment] order fetch failed:", err);
    return NextResponse.json(
      { error: "Could not verify payment with Razorpay." },
      { status: 502 }
    );
  }

  if (order.status !== "paid") {
    return NextResponse.json(
      { error: "Order has not been paid." },
      { status: 400 }
    );
  }
  if (Number(order.amount) !== asset.price) {
    return NextResponse.json(
      { error: "Payment amount does not match the asset price." },
      { status: 400 }
    );
  }
  const notes = order.notes ?? {};
  const orderAssetId = typeof notes === "object" ? (notes as Record<string, unknown>).assetId : undefined;
  const orderBuyerId = typeof notes === "object" ? (notes as Record<string, unknown>).buyerId : undefined;
  if (orderAssetId !== asset.id) {
    return NextResponse.json(
      { error: "Payment is for a different asset." },
      { status: 400 }
    );
  }
  if (orderBuyerId !== session.user.id) {
    return NextResponse.json(
      { error: "Payment does not match the signed-in buyer." },
      { status: 403 }
    );
  }

  // Idempotency: if a verified purchase already exists for this order,
  // just return its license key. Prevents double-credit if verify is
  // somehow triggered twice for the same Razorpay order.
  const dup = await prisma.purchase.findFirst({
    where: { razorpayOrderId: razorpay_order_id, status: "COMPLETED" },
    select: { id: true, licenseKey: true },
  });
  if (dup) {
    return NextResponse.json({
      ok: true,
      purchaseId: dup.id,
      licenseKey: dup.licenseKey,
    });
  }

  const commissionPct = Number(process.env.PLATFORM_COMMISSION_PERCENT ?? "20");
  const { platformFee, creatorEarning } = commissionCalc(
    asset.price,
    commissionPct
  );

  try {
    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          buyerId: session.user.id,
          assetId: asset.id,
          amount: asset.price,
          platformFee,
          creatorEarning,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          status: "COMPLETED",
        },
        select: { id: true, licenseKey: true },
      });

      await tx.user.update({
        where: { id: asset.uploaderId },
        data: { balance: { increment: creatorEarning } },
      });

      return created;
    });

    // Notify both sides of the sale — best-effort, never blocks the response.
    await createNotifications([
      {
        userId: session.user.id,
        type: "PURCHASE",
        title: "Purchase complete",
        body: `"${asset.title}" is now in your library.`,
        link: "/dashboard/library",
      },
      {
        userId: asset.uploaderId,
        type: "SALE",
        title: "You made a sale!",
        body: `Someone bought "${asset.title}" — ${formatPrice(
          creatorEarning
        )} was added to your balance.`,
        link: "/dashboard/earnings",
      },
    ]);

    return NextResponse.json({
      ok: true,
      purchaseId: purchase.id,
      licenseKey: purchase.licenseKey,
    });
  } catch (err) {
    console.error("[verify-payment] failed:", err);
    return NextResponse.json(
      { error: "Payment verified but could not finalize. Contact support." },
      { status: 500 }
    );
  }
}
