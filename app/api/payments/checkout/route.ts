import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { commissionCalc } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * Single checkout endpoint that supports two payment methods:
 *
 *   - "paypal" — real PayPal sandbox/live flow. Requires PAYPAL_CLIENT_ID and
 *     PAYPAL_CLIENT_SECRET in env. (Currently returns 501 — full PayPal
 *     create-order/capture-order flow lands in Phase 7.)
 *
 *   - "mock"   — dev-only: creates a COMPLETED Purchase row instantly.
 *     Refused when PayPal IS configured (prevents accidental free purchases
 *     in production).
 *
 * After a successful purchase the route credits the creator's balance and
 * returns the new license key so the client can navigate to the library.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { assetId, method } = (body ?? {}) as {
    assetId?: string;
    method?: "paypal" | "mock";
  };

  if (!assetId || typeof assetId !== "string") {
    return NextResponse.json(
      { error: "Asset ID is required." },
      { status: 400 }
    );
  }
  if (method !== "paypal" && method !== "mock") {
    return NextResponse.json(
      { error: "Invalid payment method." },
      { status: 400 }
    );
  }

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
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
      { error: "This asset is not available for purchase." },
      { status: 400 }
    );
  }
  if (asset.uploaderId === session.user.id) {
    return NextResponse.json(
      { error: "You can't purchase your own asset." },
      { status: 400 }
    );
  }
  if (asset.price === 0) {
    return NextResponse.json(
      { error: "This asset is free — no purchase needed." },
      { status: 400 }
    );
  }

  const existing = await prisma.purchase.findFirst({
    where: {
      buyerId: session.user.id,
      assetId: asset.id,
      status: "COMPLETED",
    },
    select: { id: true, licenseKey: true },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyOwned: true,
      licenseKey: existing.licenseKey,
    });
  }

  const paypalConfigured = !!(
    process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
  );

  if (method === "paypal") {
    if (!paypalConfigured) {
      return NextResponse.json(
        {
          error:
            "PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET, or use mock-pay during development.",
        },
        { status: 501 }
      );
    }
    // TODO Phase 7: real PayPal create-order + capture-order flow.
    return NextResponse.json(
      { error: "PayPal checkout integration is not finished yet." },
      { status: 501 }
    );
  }

  // method === "mock"
  if (paypalConfigured && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Mock checkout is disabled in production." },
      { status: 403 }
    );
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
          status: "COMPLETED",
        },
        select: { id: true, licenseKey: true },
      });

      // Credit the creator's pending payout balance
      await tx.user.update({
        where: { id: asset.uploaderId },
        data: { balance: { increment: creatorEarning } },
      });

      return created;
    });

    return NextResponse.json({
      ok: true,
      purchaseId: purchase.id,
      licenseKey: purchase.licenseKey,
    });
  } catch (err) {
    console.error("[checkout] failed:", err);
    return NextResponse.json(
      { error: "Could not complete purchase. Please try again." },
      { status: 500 }
    );
  }
}
