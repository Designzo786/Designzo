import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function ensureAssetExists(assetId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true, status: true },
  });
  if (!asset) return null;
  // Only allow liking assets that are publicly visible
  if (asset.status !== "APPROVED") return null;
  return asset;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: assetId } = await params;
  const asset = await ensureAssetExists(assetId);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Idempotent: if the like already exists, do nothing; otherwise create it
  // and bump the cached counter on Asset.
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.assetLike.findUnique({
      where: {
        userId_assetId: { userId: session.user.id, assetId },
      },
      select: { id: true },
    });

    if (existing) {
      const a = await tx.asset.findUnique({
        where: { id: assetId },
        select: { likes: true },
      });
      return { liked: true, likes: a?.likes ?? 0 };
    }

    await tx.assetLike.create({
      data: { userId: session.user.id, assetId },
    });
    const updated = await tx.asset.update({
      where: { id: assetId },
      data: { likes: { increment: 1 } },
      select: { likes: true },
    });
    return { liked: true, likes: updated.likes };
  });

  return NextResponse.json(result);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: assetId } = await params;

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.assetLike.findUnique({
      where: {
        userId_assetId: { userId: session.user.id, assetId },
      },
      select: { id: true },
    });

    if (!existing) {
      const a = await tx.asset.findUnique({
        where: { id: assetId },
        select: { likes: true },
      });
      return { liked: false, likes: a?.likes ?? 0 };
    }

    await tx.assetLike.delete({ where: { id: existing.id } });
    const updated = await tx.asset.update({
      where: { id: assetId },
      data: { likes: { decrement: 1 } },
      select: { likes: true },
    });
    return { liked: false, likes: Math.max(0, updated.likes) };
  });

  return NextResponse.json(result);
}
