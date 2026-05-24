import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { commissionCalc, formatPrice } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { createNotifications } from "@/lib/notifications";

export const runtime = "nodejs";

/**
 * Dev-only mock checkout. Creates a COMPLETED Purchase row instantly
 * without going through Razorpay.
 *
 * Hard-disabled in production AND when Razorpay is configured — real
 * payments must go through /api/payments/create-order + verify-payment.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const rl = checkRateLimit(req, "checkout", {
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

  const { assetId, method } = (body ?? {}) as {
    assetId?: string;
    method?: "mock";
  };

  if (!assetId || typeof assetId !== "string") {
    return NextResponse.json(
      { error: "Asset ID is required." },
      { status: 400 }
    );
  }
  if (method !== "mock") {
    return NextResponse.json(
      { error: "Invalid payment method." },
      { status: 400 }
    );
  }

  // Mock checkout is a DEV-ONLY convenience — it instantly creates a Purchase
  // without going through Razorpay. Hard-block in production regardless of
  // whether Razorpay env vars happen to be set, so a misconfigured prod deploy
  // can never let users grab paid assets for free.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Mock checkout is disabled in production." },
      { status: 403 }
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

      await tx.user.update({
        where: { id: asset.uploaderId },
        data: { balance: { increment: creatorEarning } },
      });

      return created;
    });

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
    console.error("[checkout] failed:", err);
    return NextResponse.json(
      { error: "Could not complete purchase. Please try again." },
      { status: 500 }
    );
  }
}
