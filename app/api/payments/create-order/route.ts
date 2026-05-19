import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";
import { flags } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Creates a Razorpay order for an asset purchase.
 *
 * The order_id returned here is what the client uses to open the Razorpay
 * checkout modal. After the user pays, the client posts the payment details
 * back to /api/payments/verify-payment for HMAC verification.
 *
 * We DO NOT create a Purchase row at this stage — only on verified payment.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Cap order creation — prevents a logged-in user spamming Razorpay's
  // orders API (each call is a billable/rate-limited request upstream).
  const rl = checkRateLimit(req, "create-order", {
    limit: 15,
    windowMs: 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  if (!flags.hasRazorpay) {
    return NextResponse.json(
      {
        error:
          "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      },
      { status: 501 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { assetId } = (body ?? {}) as { assetId?: string };
  if (!assetId || typeof assetId !== "string") {
    return NextResponse.json(
      { error: "Asset ID is required." },
      { status: 400 }
    );
  }

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true, price: true, status: true, uploaderId: true, title: true },
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

  // Already owned? Short-circuit before talking to Razorpay.
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
      alreadyOwned: true,
      licenseKey: existing.licenseKey,
    });
  }

  // Razorpay receipt has a 40-char max length — cuid()s are 25, so safe.
  const receipt = `asset_${asset.id}_${Date.now()}`.slice(0, 40);

  try {
    const order = await getRazorpay().orders.create({
      amount: asset.price, // already stored in paise
      currency: "INR",
      receipt,
      notes: {
        assetId: asset.id,
        buyerId: session.user.id,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      assetTitle: asset.title,
    });
  } catch (err) {
    console.error("[create-order] Razorpay error:", err);
    return NextResponse.json(
      { error: "Could not create payment order. Please try again." },
      { status: 500 }
    );
  }
}
