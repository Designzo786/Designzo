import { NextResponse } from "next/server";
import path from "node:path";
import JSZip from "jszip";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readPrivate } from "@/lib/storage";
import { renderLicenseText } from "@/lib/license";
import { creatorDisplayName } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * Download endpoint for an asset's actual file(s).
 *
 * Access rules:
 *   - The uploader can always download their own file (preview / re-upload).
 *   - Admins can always download (for moderation review).
 *   - A user with a COMPLETED Purchase row for this asset can download.
 *   - Free + APPROVED assets can be downloaded by any signed-in user;
 *     a Purchase row is auto-created the first time, so it shows in Library.
 *   - Everyone else gets 403.
 *
 * Response shape:
 *   - LOTTIE assets: a ZIP bundle containing the Lottie source files
 *     (JSON or .lottie, plus the optional GIF/MP4 companion uploads) AND
 *     a per-buyer LICENSE.txt generated from `lib/license.ts`. The ZIP
 *     is built in-memory at request time so the LICENSE always reflects
 *     the *current* buyer; size limits at upload time keep this safe.
 *   - All other types: the single private file streamed back unchanged.
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
      lottieGifKey: true,
      lottieMp4Key: true,
      price: true,
      status: true,
      fileType: true,
      license: true,
      uploaderId: true,
      uploader: { select: { name: true, role: true } },
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
  // The buyer's purchase row — used to populate the LICENSE.txt with the
  // exact key and date the bundle is being downloaded against.
  let purchase: {
    licenseKey: string;
    amount: number;
    createdAt: Date;
  } | null = null;

  if (!allowed && isApproved) {
    if (isFree) {
      // Track the free download as a Purchase row (per CLAUDE.md). Idempotent
      // thanks to the @@unique([buyerId, assetId]) constraint.
      const freePurchase = await prisma.purchase
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
          select: { licenseKey: true, amount: true, createdAt: true },
        })
        .catch(() => null);
      if (freePurchase) purchase = freePurchase;
      allowed = true;
    } else {
      const paidPurchase = await prisma.purchase.findFirst({
        where: {
          buyerId: session.user.id,
          assetId: asset.id,
          status: "COMPLETED",
        },
        select: { licenseKey: true, amount: true, createdAt: true },
      });
      if (paidPurchase) {
        purchase = paidPurchase;
        allowed = true;
      }
    }
  }

  if (!allowed) {
    return NextResponse.json(
      { error: "You don't have access to this file." },
      { status: 403 }
    );
  }

  // ── LOTTIE bundle download ─────────────────────────────────────────────
  // Build a ZIP containing the source Lottie file, any optional companion
  // formats (GIF/MP4), and a buyer-specific LICENSE.txt. We use jszip's
  // in-memory build because Vercel serverless can stream the resulting
  // Uint8Array in a single response — bundle sizes are capped at upload
  // time (15MB GIF + 25MB MP4 + small JSON) so the total stays manageable.
  if (asset.fileType === "LOTTIE") {
    const zip = new JSZip();

    // 1. Lottie source — required.
    try {
      const lottieBuf = await readPrivate(asset.fileKey);
      const lottieName = lottieFilename(asset.fileKey, asset.title);
      zip.file(lottieName, lottieBuf);
    } catch (err) {
      console.error("[asset download] lottie source read failed:", err);
      return NextResponse.json(
        { error: "Source file could not be read." },
        { status: 500 }
      );
    }

    // 2. Optional GIF companion.
    if (asset.lottieGifKey) {
      try {
        const buf = await readPrivate(asset.lottieGifKey);
        zip.file(`${slugify(asset.title)}.gif`, buf);
      } catch (err) {
        console.error("[asset download] gif companion read failed:", err);
        // Non-fatal — the bundle still works without the GIF.
      }
    }

    // 3. Optional MP4 companion.
    if (asset.lottieMp4Key) {
      try {
        const buf = await readPrivate(asset.lottieMp4Key);
        zip.file(`${slugify(asset.title)}.mp4`, buf);
      } catch (err) {
        console.error("[asset download] mp4 companion read failed:", err);
      }
    }

    // 4. Per-buyer LICENSE.txt. Falls back to a generic admin/owner copy
    //    when there's no Purchase row (admin / uploader preview download).
    const licenseText = renderLicenseText({
      assetId: asset.id,
      assetTitle: asset.title,
      creatorName: creatorDisplayName(
        asset.uploader.name,
        asset.uploader.role
      ),
      buyerName: session.user.name ?? "—",
      buyerEmail: session.user.email ?? "—",
      purchaseLicenseKey:
        purchase?.licenseKey ?? (isOwner ? "OWNER-COPY" : "ADMIN-COPY"),
      purchasedAt: purchase?.createdAt ?? new Date(),
      amountPaise: purchase?.amount ?? asset.price,
      licenseType: asset.license,
    });
    zip.file("LICENSE.txt", licenseText);

    // 5. Tiny README explaining what each file in the bundle is for. Helps
    //    less-technical buyers know where the JSON vs the GIF goes.
    zip.file("README.txt", renderReadmeText(asset.title));

    const zipBytes = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    if (!isOwner && !isAdmin) {
      await prisma.asset
        .update({
          where: { id: asset.id },
          data: { downloads: { increment: 1 } },
        })
        .catch(() => {});
    }

    const bundleName = `${slugify(asset.title)}-bundle.zip`;
    return new NextResponse(Buffer.from(zipBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(zipBytes.length),
        "Content-Disposition": `attachment; filename="${bundleName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  // ── Non-Lottie: single-file download (unchanged from before) ───────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "asset"
  );
}

/**
 * Name the Lottie source file inside the ZIP. Preserves the original
 * extension (.json vs .lottie) so buyers can drop it straight into their
 * tooling, but renames it to the asset's slug so it doesn't carry our
 * internal nonce/safe-name prefix.
 */
function lottieFilename(fileKey: string, title: string): string {
  const base = path.basename(fileKey);
  const dot = base.lastIndexOf(".");
  const ext = dot >= 0 ? base.slice(dot + 1).toLowerCase() : "json";
  const safeExt = ext === "lottie" ? "lottie" : "json";
  return `${slugify(title)}.${safeExt}`;
}

function renderReadmeText(title: string): string {
  return [
    `${title}`,
    "================================================================",
    "",
    "This bundle contains the following files:",
    "",
    "  • <name>.json or .lottie — the Lottie animation source. Drop this",
    "    into LottieFiles, lottie-web, lottie-react, dotlottie, or any",
    "    other Lottie-compatible runtime.",
    "",
    "  • <name>.gif (if present) — a static-quality fallback that plays in",
    "    email clients, presentations, or any environment that can't run",
    "    Lottie/JS.",
    "",
    "  • <name>.mp4 (if present) — a video render suitable for social",
    "    media, ads, and short-form video tools.",
    "",
    "  • LICENSE.txt — your perpetual, royalty-free license for this asset.",
    "    Keep this file with your project records.",
    "",
    "Need help? Reach out via https://designzo.com/contact",
    "",
  ].join("\r\n");
}
