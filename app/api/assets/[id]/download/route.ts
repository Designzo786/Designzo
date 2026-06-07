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
// Download is selectable — the buyer can request a single format via
// ?format=. Lottie still defaults to the full ZIP bundle when no value
// is sent; 3D assets default to the primary file (.glb / .gltf).
// Any unknown value silently falls back to the asset's default behaviour
// so a stale bookmark never breaks.
type DownloadFormat =
  | "zip"
  | "json"
  | "lottie"
  | "gif"
  | "mp4"
  | "glb"
  | "gltf"
  | "fbx"
  | "obj"
  | "usdz";
const VALID_FORMATS: ReadonlyArray<DownloadFormat> = [
  "zip",
  "json",
  "lottie",
  "gif",
  "mp4",
  "glb",
  "gltf",
  "fbx",
  "obj",
  "usdz",
];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const rawFormat = new URL(req.url).searchParams.get("format") ?? "";
  const format: DownloadFormat | "" = VALID_FORMATS.includes(
    rawFormat as DownloadFormat
  )
    ? (rawFormat as DownloadFormat)
    : "";

  const asset = await prisma.asset.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      fileKey: true,
      lottieGifKey: true,
      lottieMp4Key: true,
      modelFbxKey: true,
      modelObjKey: true,
      modelUsdzKey: true,
      price: true,
      status: true,
      fileType: true,
      license: true,
      uploaderId: true,
      uploader: { select: { name: true, role: true, email: true } },
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

  // ── MODEL_3D single-format download ───────────────────────────────────
  // 3D assets never bundle. The primary file (.glb / .gltf) ships as the
  // default; the FBX / OBJ / USDZ companions ship on explicit ?format=.
  if (asset.fileType === "MODEL_3D") {
    let singleKey: string | null = null;
    let ext = "glb";
    switch (format) {
      case "fbx":
        singleKey = asset.modelFbxKey;
        ext = "fbx";
        break;
      case "obj":
        singleKey = asset.modelObjKey;
        ext = "obj";
        break;
      case "usdz":
        singleKey = asset.modelUsdzKey;
        ext = "usdz";
        break;
      case "gltf":
        singleKey = asset.fileKey;
        ext = "gltf";
        break;
      case "glb":
      case "":
      default:
        singleKey = asset.fileKey;
        ext = "glb";
        break;
    }

    if (singleKey) {
      try {
        const buf = await readPrivate(singleKey);
        if (!isOwner && !isAdmin) {
          await prisma.asset
            .update({
              where: { id: asset.id },
              data: { downloads: { increment: 1 } },
            })
            .catch(() => {});
        }
        const downloadName = `${slugify(asset.title)}.${ext}`;
        return new NextResponse(new Uint8Array(buf), {
          status: 200,
          headers: {
            "Content-Type": contentTypeForFormat(ext as DownloadFormat),
            "Content-Length": String(buf.length),
            "Content-Disposition": `attachment; filename="${downloadName}"`,
            "Cache-Control": "private, no-store",
          },
        });
      } catch (err) {
        console.error(
          `[asset download] model-3d (${ext}) read failed:`,
          err
        );
        return NextResponse.json(
          { error: "File could not be read." },
          { status: 500 }
        );
      }
    }
    // Companion was requested but not available — fall through to the
    // generic non-Lottie single-file path below which returns the
    // primary file.
  }

  // ── LOTTIE single-format download (json / lottie / gif / mp4) ─────────
  // Buyer picked one specific format from the download dropdown instead
  // of the full bundle. Return just that file, still with a private,
  // no-cache header so it never lands in a CDN. Falls through to the
  // ZIP path below if the requested companion isn't actually present
  // (e.g. someone hit ?format=gif on a Lottie that didn't ship a GIF).
  // Hard-restrict to Lottie-valid formats so a hand-crafted URL like
  // ?format=fbx on a Lottie asset can't trick us into serving the JSON
  // source mislabelled with a 3D extension.
  const LOTTIE_VALID_SINGLE = ["json", "lottie", "gif", "mp4"] as const;
  if (
    asset.fileType === "LOTTIE" &&
    LOTTIE_VALID_SINGLE.includes(
      format as (typeof LOTTIE_VALID_SINGLE)[number]
    )
  ) {
    const singleKey: string | null =
      format === "gif"
        ? asset.lottieGifKey
        : format === "mp4"
          ? asset.lottieMp4Key
          : asset.fileKey; // json or .lottie are the same primary key
    if (singleKey) {
      try {
        const buf = await readPrivate(singleKey);
        if (!isOwner && !isAdmin) {
          await prisma.asset
            .update({
              where: { id: asset.id },
              data: { downloads: { increment: 1 } },
            })
            .catch(() => {});
        }
        // `format` is narrowed to one of LOTTIE_VALID_SINGLE here, so the
        // cast is safe — both type aliases share the same string members.
        const lottieFormat = format as DownloadFormat;
        const ext = lottieFormat === "lottie" ? "lottie" : lottieFormat;
        const downloadName = `${slugify(asset.title)}.${ext}`;
        return new NextResponse(new Uint8Array(buf), {
          status: 200,
          headers: {
            "Content-Type": contentTypeForFormat(lottieFormat),
            "Content-Length": String(buf.length),
            "Content-Disposition": `attachment; filename="${downloadName}"`,
            "Cache-Control": "private, no-store",
          },
        });
      } catch (err) {
        console.error(
          `[asset download] single-format (${format}) read failed:`,
          err
        );
        // Drop through to the ZIP fallback so the buyer still gets something.
      }
    }
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
        asset.uploader.role,
        asset.uploader.email
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

/** MIME type to send back when serving a single asset format. */
function contentTypeForFormat(format: DownloadFormat): string {
  switch (format) {
    case "json":
      return "application/json";
    case "lottie":
      return "application/zip"; // dotLottie is a ZIP container
    case "gif":
      return "image/gif";
    case "mp4":
      return "video/mp4";
    case "glb":
      return "model/gltf-binary";
    case "gltf":
      return "model/gltf+json";
    case "fbx":
      return "application/octet-stream";
    case "obj":
      return "model/obj";
    case "usdz":
      return "model/vnd.usdz+zip";
    case "zip":
    default:
      return "application/zip";
  }
}
