import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

const MAX_COMMENT = 1000;

/**
 * Recomputes an asset's denormalized rating fields from its reviews.
 * Run inside the same transaction as the review write so the aggregates
 * never drift from the underlying rows.
 */
async function syncAssetRating(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  assetId: string
) {
  const agg = await tx.review.aggregate({
    where: { assetId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await tx.asset.update({
    where: { id: assetId },
    data: {
      avgRating: agg._avg.rating ?? 0,
      reviewCount: agg._count._all,
    },
  });
}

/**
 * Create or update the signed-in user's review of an asset.
 * Only buyers who own the asset may review it — and never the uploader.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const rl = await checkRateLimit(req, "review", {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  const { id: assetId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { rating, comment } = (body ?? {}) as {
    rating?: number;
    comment?: string;
  };

  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return NextResponse.json(
      { error: "Rating must be a whole number from 1 to 5." },
      { status: 400 }
    );
  }
  if (comment !== undefined && typeof comment !== "string") {
    return NextResponse.json({ error: "Invalid comment." }, { status: 400 });
  }
  if (comment && comment.length > MAX_COMMENT) {
    return NextResponse.json(
      { error: `Review must be ${MAX_COMMENT} characters or less.` },
      { status: 400 }
    );
  }

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true, title: true, status: true, uploaderId: true },
  });
  if (!asset || asset.status !== "APPROVED") {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }
  if (asset.uploaderId === session.user.id) {
    return NextResponse.json(
      { error: "You can't review your own asset." },
      { status: 403 }
    );
  }

  // Only owners may review — keeps ratings tied to real purchases.
  const owns = await prisma.purchase.findFirst({
    where: {
      buyerId: session.user.id,
      assetId,
      status: "COMPLETED",
    },
    select: { id: true },
  });
  if (!owns) {
    return NextResponse.json(
      { error: "Only buyers who own this asset can review it." },
      { status: 403 }
    );
  }

  // First-time review? Decide before the upsert so we only notify on create.
  const existing = await prisma.review.findUnique({
    where: { userId_assetId: { userId: session.user.id, assetId } },
    select: { id: true },
  });
  const isNew = !existing;

  const trimmedComment = comment?.trim() || null;

  await prisma.$transaction(async (tx) => {
    await tx.review.upsert({
      where: { userId_assetId: { userId: session.user.id, assetId } },
      create: {
        userId: session.user.id,
        assetId,
        rating,
        comment: trimmedComment,
      },
      update: { rating, comment: trimmedComment },
    });
    await syncAssetRating(tx, assetId);
  });

  if (isNew) {
    await createNotification({
      userId: asset.uploaderId,
      type: "REVIEW",
      title: "New review",
      body: `${session.user.name ?? "A buyer"} rated "${asset.title}" ${rating}★.`,
      link: `/explore/${assetId}`,
    });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Remove the signed-in user's own review of an asset.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id: assetId } = await params;

  const existing = await prisma.review.findUnique({
    where: { userId_assetId: { userId: session.user.id, assetId } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "No review to remove." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: existing.id } });
    await syncAssetRating(tx, assetId);
  });

  return NextResponse.json({ ok: true });
}
