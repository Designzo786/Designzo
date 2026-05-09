import { NextResponse } from "next/server";
import path from "node:path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readPrivate } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Download endpoint for an asset's actual file.
 *
 * Access rules:
 *   - The uploader can always download their own file (preview / re-upload).
 *   - Admins can always download (for moderation review).
 *   - A user with a COMPLETED Purchase row for this asset can download.
 *   - Free + APPROVED assets can be downloaded by any signed-in user;
 *     a Purchase row is auto-created the first time, so it shows in Library.
 *   - Everyone else gets 403.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      fileKey: true,
      price: true,
      status: true,
      uploaderId: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const isOwner = asset.uploaderId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const isApproved = asset.status === "APPROVED";
  const isFree = asset.price === 0;

  let allowed = isOwner || isAdmin;

  if (!allowed && isApproved) {
    if (isFree) {
      // Track the free download as a Purchase row (per CLAUDE.md). Idempotent
      // thanks to the @@unique([buyerId, assetId]) constraint.
      await prisma.purchase
        .upsert({
          where: {
            buyerId_assetId: {
              buyerId: session.user.id,
              assetId: asset.id,
            },
          },
          create: {
            buyerId: session.user.id,
            assetId: asset.id,
            amount: 0,
            platformFee: 0,
            creatorEarning: 0,
            status: "COMPLETED",
          },
          update: {},
        })
        .catch(() => {
          // Don't block the download if tracking fails
        });
      allowed = true;
    } else {
      const purchase = await prisma.purchase.findFirst({
        where: {
          buyerId: session.user.id,
          assetId: asset.id,
          status: "COMPLETED",
        },
        select: { id: true },
      });
      allowed = !!purchase;
    }
  }

  if (!allowed) {
    return NextResponse.json(
      { error: "You don't have access to this file." },
      { status: 403 }
    );
  }

  let buffer: Buffer;
  try {
    buffer = await readPrivate(asset.fileKey);
  } catch (err) {
    console.error("[asset download] read failed:", err);
    return NextResponse.json(
      { error: "File could not be read." },
      { status: 500 }
    );
  }

  // Bump downloads counter only for actual buyer/free downloads — not admins
  // or re-downloads by the uploader.
  if (!isOwner && !isAdmin) {
    await prisma.asset
      .update({ where: { id: asset.id }, data: { downloads: { increment: 1 } } })
      .catch(() => {});
  }

  const downloadName = path.basename(asset.fileKey).replace(/^[a-f0-9]{16}-/, "");

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${downloadName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
