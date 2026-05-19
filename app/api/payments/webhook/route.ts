import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { commissionCalc, formatPrice } from "@/lib/utils";
import { mapRazorpayXStatus } from "@/lib/razorpay-payouts";
import { createNotification, createNotifications } from "@/lib/notifications";

export const runtime = "nodejs";

/**
 * Razorpay webhook receiver — the reliable backstop for payment and payout
 * state. The browser-side verify-payment call can be lost (tab closed, network
 * drop) AFTER the money moved; this webhook ensures the DB still converges.
 *
 * Register it in the Razorpay dashboard (Settings → Webhooks) pointing at:
 *   https://yourdomain.com/api/payments/webhook
 * and subscribe to: payment.captured, payment.failed, payout.processed,
 * payout.failed, payout.reversed.
 *
 * Every handler is idempotent — Razorpay retries webhooks, so the same event
 * may arrive several times.
 */
export async function POST(req: Request) {
  // Signature is computed over the RAW body — read text, never .json() first.
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: RazorpayPaymentEntity };
      payout?: { entity?: RazorpayPayoutEntity };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  try {
    switch (event.event) {
      case "payment.captured":
        await handlePaymentCaptured(event.payload?.payment?.entity);
        break;
      case "payment.failed":
        // Nothing to reverse — we never create a Purchase before capture.
        console.warn(
          "[webhook] payment.failed:",
          event.payload?.payment?.entity?.id
        );
        break;
      case "payout.processed":
      case "payout.failed":
      case "payout.reversed":
        await handlePayoutUpdate(event.payload?.payout?.entity);
        break;
      default:
        // Unsubscribed/unknown event — ack so Razorpay stops retrying.
        break;
    }
  } catch (err) {
    console.error(`[webhook] handler error for ${event.event}:`, err);
    // 500 tells Razorpay to retry later — appropriate for transient DB errors.
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

interface RazorpayPaymentEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  notes?: { assetId?: string; buyerId?: string };
}

interface RazorpayPayoutEntity {
  id?: string;
  status?: string;
}

/**
 * Backstop for a captured payment: if verify-payment never recorded the
 * Purchase (lost callback), create it here from the order notes.
 */
async function handlePaymentCaptured(payment?: RazorpayPaymentEntity) {
  if (!payment?.order_id || !payment.id) return;

  // Already recorded by verify-payment (the happy path)? Done.
  const existing = await prisma.purchase.findFirst({
    where: { razorpayOrderId: payment.order_id, status: "COMPLETED" },
    select: { id: true },
  });
  if (existing) return;

  const assetId = payment.notes?.assetId;
  const buyerId = payment.notes?.buyerId;
  if (!assetId || !buyerId) {
    console.warn(
      "[webhook] payment.captured missing notes — cannot reconstruct purchase:",
      payment.id
    );
    return;
  }

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true, title: true, price: true, uploaderId: true },
  });
  if (!asset) {
    console.warn("[webhook] payment.captured for unknown asset:", assetId);
    return;
  }

  const commissionPct = Number(process.env.PLATFORM_COMMISSION_PERCENT ?? "20");
  const { platformFee, creatorEarning } = commissionCalc(
    asset.price,
    commissionPct
  );

  // Race guard: verify-payment may land between our findFirst and create.
  // The @@unique([buyerId, assetId]) constraint makes the create throw P2002 —
  // we swallow that since it means the purchase exists, which is the goal.
  try {
    await prisma.$transaction(async (tx) => {
      await tx.purchase.create({
        data: {
          buyerId,
          assetId: asset.id,
          amount: asset.price,
          platformFee,
          creatorEarning,
          razorpayOrderId: payment.order_id,
          razorpayPaymentId: payment.id,
          status: "COMPLETED",
        },
      });
      await tx.user.update({
        where: { id: asset.uploaderId },
        data: { balance: { increment: creatorEarning } },
      });
    });
    await createNotifications([
      {
        userId: buyerId,
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
    console.info("[webhook] recovered lost purchase for order:", payment.order_id);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2002"
    ) {
      return; // purchase already exists — fine
    }
    throw err;
  }
}

/**
 * Updates a Payout from a RazorpayX payout status webhook. A failed or
 * reversed payout credits the amount back to the creator's balance so they
 * can retry — but only once (guarded by the prior status check).
 */
async function handlePayoutUpdate(entity?: RazorpayPayoutEntity) {
  if (!entity?.id || !entity.status) return;

  const payout = await prisma.payout.findFirst({
    where: { razorpayPayoutId: entity.id },
    select: { id: true, status: true, amount: true, creatorId: true },
  });
  if (!payout) {
    console.warn("[webhook] payout update for unknown RazorpayX id:", entity.id);
    return;
  }

  const next = mapRazorpayXStatus(entity.status);
  if (next === payout.status) return; // already in this state — idempotent no-op

  const isRefund =
    (next === "FAILED") && payout.status !== "FAILED";

  if (isRefund) {
    await prisma.$transaction([
      prisma.payout.update({
        where: { id: payout.id },
        data: { status: "FAILED", failureReason: `RazorpayX: ${entity.status}` },
      }),
      prisma.user.update({
        where: { id: payout.creatorId },
        data: { balance: { increment: payout.amount } },
      }),
    ]);
  } else {
    await prisma.payout.update({
      where: { id: payout.id },
      data: { status: next },
    });
  }

  // Notify the creator of the new payout state.
  const amount = formatPrice(payout.amount);
  if (next === "PAID") {
    await createNotification({
      userId: payout.creatorId,
      type: "PAYOUT_PAID",
      title: "Payout sent",
      body: `${amount} has been sent to your registered bank account.`,
      link: "/dashboard/earnings",
    });
  } else if (next === "FAILED") {
    await createNotification({
      userId: payout.creatorId,
      type: "PAYOUT_FAILED",
      title: "Payout failed",
      body: `Your payout of ${amount} could not be completed. The amount was returned to your balance.`,
      link: "/dashboard/earnings",
    });
  } else if (next === "PROCESSING") {
    await createNotification({
      userId: payout.creatorId,
      type: "PAYOUT_PROCESSING",
      title: "Payout processing",
      body: `Your payout of ${amount} is being processed.`,
      link: "/dashboard/earnings",
    });
  }
}
