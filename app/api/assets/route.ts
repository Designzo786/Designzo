import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  r2Head,
  r2GetRange,
  r2Delete,
  r2Copy,
  r2PublicUrl,
} from "@/lib/r2";
import { flags } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  validateAssetFile,
  validatePreviewImage,
  validateLottieGif,
  validateLottieMp4,
  validateModelFbx,
  validateModelObj,
  validateModelUsdz,
  getExtension,
} from "@/lib/upload-validation";
import { isValidSubcategory } from "@/lib/mock/assets";
import type { FileType } from "@prisma/client";

export const runtime = "nodejs";

const MAX_PREVIEW_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_LOTTIE_GIF_BYTES = 15 * 1024 * 1024;
const MAX_LOTTIE_MP4_BYTES = 25 * 1024 * 1024;
const MAX_MODEL_FBX_BYTES = 30 * 1024 * 1024;
const MAX_MODEL_OBJ_BYTES = 20 * 1024 * 1024;
const MAX_MODEL_USDZ_BYTES = 20 * 1024 * 1024;

// Cap the byte range we pull from R2 for content validation. 256 KB is
// generous for every magic-byte check + the looksLikeLottieJson structural
// scan (which only needs the first 32 KB). SVGs are downloaded in full
// below since the script-tag scan has to cover the whole document.
const VALIDATION_BYTE_RANGE = 256 * 1024 - 1;

const VALID_FILE_TYPES: FileType[] = [
  "MODEL_3D" as FileType,
  "LOTTIE" as FileType,
  "SVG_ICON" as FileType,
];

const VALID_CATEGORIES = ["3d-models", "3d-icons", "lottie", "svg-icons"];

// File extensions whose content can be rendered straight in the browser
// — for these we publish a public copy of the source so the asset-detail
// viewer can fetch it. Buyers still need to be authorised to download the
// private copy of the same file; this public copy is render-only.
const PUBLIC_VIEWER_EXTENSIONS = ["glb", "gltf", "json", "lottie", "svg"];

interface CreateAssetBody {
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string | null;
  fileType?: string;
  priceCents?: number | string;
  tags?: string;
  fileName?: string;
  keys?: {
    file?: string;
    preview?: string;
    lottieGif?: string;
    lottieMp4?: string;
    modelFbx?: string;
    modelObj?: string;
    modelUsdz?: string;
  };
}

/**
 * Create an asset row after the browser has uploaded its files directly
 * to R2 via pre-signed PUT URLs issued by /api/assets/upload-url.
 *
 * Why JSON instead of multipart:
 *   The legacy multipart route relayed the entire file through the
 *   serverless function, which hits Vercel's 4.5 MB body-size limit on
 *   every plan including Pro. Direct-to-R2 uploads from the browser
 *   bypass the function entirely; this route now only sees metadata +
 *   the resulting R2 keys, which is always a few hundred bytes.
 *
 * Trust model:
 *   The signed-URL route enforced extension + size + per-fileType slot
 *   gating before issuing each URL. By the time we get here we trust the
 *   client to have uploaded the SAME files it asked URLs for, but we
 *   still verify everything that matters second-hand from R2:
 *     - HeadObject confirms the upload landed (size + existence).
 *     - GetRange + validateAssetFile re-runs the magic-byte / structural
 *       scan on the actual bytes in R2 so a tampered client can't
 *       smuggle, say, a renamed .exe under the .glb signed URL.
 *     - Keys are required to be under the user's own prefix —
 *       `<bucket>/<visibility>/<...>/<userId>/...`.
 *   On any validation failure we delete every R2 object we touched so
 *   the bucket doesn't accumulate orphans.
 */
export async function POST(req: Request) {
  if (!flags.hasR2) {
    return NextResponse.json(
      { error: "Storage isn't configured. R2 credentials missing." },
      { status: 503 }
    );
  }

  const rl = checkRateLimit(req, "asset-upload", {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (session.user.role === "USER") {
    return NextResponse.json(
      {
        error:
          "Your account type can't upload assets. Register as a Collaborator to sell.",
      },
      { status: 403 }
    );
  }

  let body: CreateAssetBody;
  try {
    body = (await req.json()) as CreateAssetBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const category = String(body.category ?? "").trim();
  const subcategoryRaw = String(body.subcategory ?? "").trim();
  const subcategory = subcategoryRaw.length > 0 ? subcategoryRaw : null;
  const fileType = String(body.fileType ?? "").trim() as FileType;
  const tagsRaw = String(body.tags ?? "").trim();
  const priceCents = Number(body.priceCents ?? 0);
  const fileName = String(body.fileName ?? "").trim();
  const keys = body.keys ?? {};

  // ─── Metadata validation (same rules as before) ───────────────────────────
  if (title.length < 3 || title.length > 100) {
    return NextResponse.json(
      { error: "Title must be 3–100 characters." },
      { status: 400 }
    );
  }
  if (description.length < 10 || description.length > 2000) {
    return NextResponse.json(
      { error: "Description must be 10–2000 characters." },
      { status: 400 }
    );
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  if (!isValidSubcategory(category, subcategory)) {
    return NextResponse.json(
      {
        error:
          "Invalid sub-category for the chosen category. Pick one of the available options or leave it blank.",
      },
      { status: 400 }
    );
  }
  if (!VALID_FILE_TYPES.includes(fileType)) {
    return NextResponse.json(
      { error: "Invalid file type." },
      { status: 400 }
    );
  }
  if (!Number.isInteger(priceCents) || priceCents < 0 || priceCents > 999999) {
    return NextResponse.json(
      { error: "Price must be a whole number of paise (0–999999)." },
      { status: 400 }
    );
  }
  if (priceCents > 0 && priceCents < 100) {
    return NextResponse.json(
      { error: "Price must be either 0 (free) or at least ₹1 (100 paise)." },
      { status: 400 }
    );
  }

  // ─── Key shape + ownership validation ─────────────────────────────────────
  if (!keys.file) {
    return NextResponse.json(
      { error: "The `file` upload key is required." },
      { status: 400 }
    );
  }
  // Lottie uploads are allowed to skip the preview slot — the public copy
  // of the animation itself is reused as previewKey further down. Every
  // other fileType still needs a still-image preview.
  if (fileType !== ("LOTTIE" as FileType) && !keys.preview) {
    return NextResponse.json(
      { error: "The `preview` upload key is required for this asset type." },
      { status: 400 }
    );
  }
  if (!fileName) {
    return NextResponse.json(
      { error: "Missing original file name." },
      { status: 400 }
    );
  }

  // Defence in depth: every key MUST live under the signed-in user's
  // prefix. The signed-URL route always issues keys of the form
  // `<visibility>/<bucket-path>/<userId>/<nonce>-<name>`, so a tampered
  // client trying to commit somebody else's upload is rejected here.
  const userId = session.user.id;
  const userPathToken = `/${userId}/`;
  const allKeys = [
    keys.file,
    keys.preview,
    keys.lottieGif,
    keys.lottieMp4,
    keys.modelFbx,
    keys.modelObj,
    keys.modelUsdz,
  ].filter((k): k is string => typeof k === "string" && k.length > 0);

  for (const k of allKeys) {
    if (!k.includes(userPathToken)) {
      return NextResponse.json(
        { error: "One of the upload keys doesn't belong to this account." },
        { status: 403 }
      );
    }
    if (k.includes("..") || k.startsWith("/")) {
      return NextResponse.json(
        { error: "Upload key contains invalid characters." },
        { status: 400 }
      );
    }
  }

  // ─── Companion gating (slot only valid under matching parent fileType) ───
  if (fileType !== ("LOTTIE" as FileType)) {
    if (keys.lottieGif || keys.lottieMp4) {
      return NextResponse.json(
        { error: "Lottie companions can only be attached to a Lottie upload." },
        { status: 400 }
      );
    }
  }
  if (fileType !== ("MODEL_3D" as FileType)) {
    if (keys.modelFbx || keys.modelObj || keys.modelUsdz) {
      return NextResponse.json(
        { error: "3D companion formats can only be attached to a 3D Model upload." },
        { status: 400 }
      );
    }
  }

  // Tags: comma-separated, deduplicated, lowercase, max 10
  const tags = Array.from(
    new Set(
      tagsRaw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length >= 2 && t.length <= 30)
    )
  ).slice(0, 10);

  // ─── Verify uploads landed in R2 + revalidate content ────────────────────
  // Anything we Head/Get/Copy here gets added to `touched` so we can
  // wipe every blob on any later failure.
  const touched: string[] = [];

  async function rollback() {
    for (const k of touched) {
      await r2Delete(k).catch(() => {});
    }
  }

  try {
    // ── Main file ──────────────────────────────────────────────────────────
    const fileHead = await r2Head(keys.file);
    if (!fileHead) {
      await rollback();
      return NextResponse.json(
        { error: "Asset file upload didn't land in storage. Please retry." },
        { status: 400 }
      );
    }
    if (fileHead.contentLength > MAX_FILE_BYTES) {
      touched.push(keys.file);
      await rollback();
      return NextResponse.json(
        { error: "Asset file exceeds 100 MB limit." },
        { status: 400 }
      );
    }
    touched.push(keys.file);

    // SVG content scan needs the whole document; everything else is
    // satisfied by the first 256 KB.
    const fileExt = getExtension(fileName);
    const fileHeadBytes = await r2GetRange(
      keys.file,
      0,
      fileExt === "svg"
        ? Math.max(0, fileHead.contentLength - 1)
        : Math.min(VALIDATION_BYTE_RANGE, fileHead.contentLength - 1)
    );

    const fileCheck = validateAssetFile(fileName, fileType, fileHeadBytes);
    if (!fileCheck.ok) {
      await rollback();
      return NextResponse.json(
        { error: fileCheck.error },
        { status: 400 }
      );
    }

    // ── Preview ────────────────────────────────────────────────────────────
    // Lottie uploads skip the still-image preview — the public copy of
    // the animation itself is reused as `previewKey` further down so
    // listing cards play the .json directly.
    let previewByteCount = 0;
    if (keys.preview) {
      const previewHead = await r2Head(keys.preview);
      if (!previewHead) {
        await rollback();
        return NextResponse.json(
          { error: "Preview upload didn't land in storage. Please retry." },
          { status: 400 }
        );
      }
      if (previewHead.contentLength > MAX_PREVIEW_BYTES) {
        touched.push(keys.preview);
        await rollback();
        return NextResponse.json(
          { error: "Preview image exceeds 5 MB limit." },
          { status: 400 }
        );
      }
      touched.push(keys.preview);

      const previewBytes = await r2GetRange(
        keys.preview,
        0,
        Math.min(VALIDATION_BYTE_RANGE, previewHead.contentLength - 1)
      );
      // The S3 SDK's HeadObject returns the Content-Type the file was
      // PUT with; we passed image/* in the signed URL so this should match.
      const previewCheck = validatePreviewImage(
        // Pass through a synthetic name with the same extension as the
        // preview key so the validator's extension check works regardless
        // of what the client chose to name the original.
        keys.preview,
        previewHead.contentType ?? "image/*",
        previewBytes
      );
      if (!previewCheck.ok) {
        await rollback();
        return NextResponse.json(
          { error: previewCheck.error },
          { status: 400 }
        );
      }
      previewByteCount = previewHead.contentLength;
    }

    let totalBundleBytes = fileHead.contentLength + previewByteCount;

    // ── Lottie GIF companion ──────────────────────────────────────────────
    if (keys.lottieGif) {
      const h = await r2Head(keys.lottieGif);
      if (!h) {
        await rollback();
        return NextResponse.json(
          { error: "Lottie GIF upload didn't land in storage. Please retry." },
          { status: 400 }
        );
      }
      touched.push(keys.lottieGif);
      if (h.contentLength > MAX_LOTTIE_GIF_BYTES) {
        await rollback();
        return NextResponse.json(
          { error: "Lottie GIF exceeds 15 MB limit." },
          { status: 400 }
        );
      }
      const bytes = await r2GetRange(
        keys.lottieGif,
        0,
        Math.min(VALIDATION_BYTE_RANGE, h.contentLength - 1)
      );
      const v = validateLottieGif(keys.lottieGif, bytes);
      if (!v.ok) {
        await rollback();
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
      totalBundleBytes += h.contentLength;
    }

    // ── Lottie MP4 companion ──────────────────────────────────────────────
    if (keys.lottieMp4) {
      const h = await r2Head(keys.lottieMp4);
      if (!h) {
        await rollback();
        return NextResponse.json(
          { error: "Lottie MP4 upload didn't land in storage. Please retry." },
          { status: 400 }
        );
      }
      touched.push(keys.lottieMp4);
      if (h.contentLength > MAX_LOTTIE_MP4_BYTES) {
        await rollback();
        return NextResponse.json(
          { error: "Lottie MP4 exceeds 25 MB limit." },
          { status: 400 }
        );
      }
      const bytes = await r2GetRange(
        keys.lottieMp4,
        0,
        Math.min(VALIDATION_BYTE_RANGE, h.contentLength - 1)
      );
      const v = validateLottieMp4(keys.lottieMp4, bytes);
      if (!v.ok) {
        await rollback();
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
      totalBundleBytes += h.contentLength;
    }

    // ── 3D model companions ───────────────────────────────────────────────
    const modelCompanions: Array<{
      key: string | undefined;
      label: string;
      max: number;
      validate: (name: string, buf: Buffer) => { ok: boolean; error?: string };
    }> = [
      {
        key: keys.modelFbx,
        label: "FBX",
        max: MAX_MODEL_FBX_BYTES,
        validate: validateModelFbx,
      },
      {
        key: keys.modelObj,
        label: "OBJ",
        max: MAX_MODEL_OBJ_BYTES,
        validate: validateModelObj,
      },
      {
        key: keys.modelUsdz,
        label: "USDZ",
        max: MAX_MODEL_USDZ_BYTES,
        validate: validateModelUsdz,
      },
    ];
    for (const c of modelCompanions) {
      if (!c.key) continue;
      const h = await r2Head(c.key);
      if (!h) {
        await rollback();
        return NextResponse.json(
          { error: `${c.label} companion upload didn't land in storage.` },
          { status: 400 }
        );
      }
      touched.push(c.key);
      if (h.contentLength > c.max) {
        await rollback();
        return NextResponse.json(
          {
            error: `${c.label} companion exceeds its ${Math.round(c.max / (1024 * 1024))} MB limit.`,
          },
          { status: 400 }
        );
      }
      const bytes = await r2GetRange(
        c.key,
        0,
        Math.min(VALIDATION_BYTE_RANGE, h.contentLength - 1)
      );
      const v = c.validate(c.key, bytes);
      if (!v.ok) {
        await rollback();
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
      totalBundleBytes += h.contentLength;
    }

    // ── Renderable: publish a public copy of the source so the viewer
    //    on the detail page can fetch it. Buyers still need to be
    //    authorised to download the private copy of the same bytes —
    //    the public path is render-only.
    let savedModelUrl: string | null = null;
    if (PUBLIC_VIEWER_EXTENSIONS.includes(fileExt)) {
      const publicKey = keys.file.replace(
        /^private\/files\//,
        "public/models/"
      );
      await r2Copy(keys.file, publicKey);
      touched.push(publicKey);
      savedModelUrl = r2PublicUrl(publicKey);
    }

    // ── Commit DB row ─────────────────────────────────────────────────────
    // previewKey is the URL marketplace cards render as the thumbnail.
    //   - LOTTIE: reuse the public Lottie URL so the animation plays
    //     on cards. We just CopyObjected the source into public/models
    //     above, so savedModelUrl is guaranteed populated here.
    //   - Everything else: use the still-image preview the creator
    //     uploaded.
    // Schema keeps previewKey as a non-null string for back-compat with
    // every consumer that assumes a populated URL — we just point it at
    // a different URL family for Lottie.
    const previewUrl =
      fileType === ("LOTTIE" as FileType) && savedModelUrl
        ? savedModelUrl
        : keys.preview
          ? r2PublicUrl(keys.preview)
          : null;
    if (!previewUrl) {
      await rollback();
      return NextResponse.json(
        {
          error:
            "Could not resolve a preview URL for this asset. Please retry the upload.",
        },
        { status: 500 }
      );
    }

    const asset = await prisma.asset.create({
      data: {
        title,
        description,
        category,
        subcategory,
        tags,
        fileType,
        price: priceCents,
        previewKey: previewUrl,
        fileKey: keys.file,
        modelKey: savedModelUrl,
        lottieGifKey: keys.lottieGif ?? null,
        lottieMp4Key: keys.lottieMp4 ?? null,
        modelFbxKey: keys.modelFbx ?? null,
        modelObjKey: keys.modelObj ?? null,
        modelUsdzKey: keys.modelUsdz ?? null,
        fileSizeBytes: totalBundleBytes,
        uploaderId: userId,
      },
      select: { id: true, status: true },
    });

    return NextResponse.json(
      { id: asset.id, status: asset.status },
      { status: 201 }
    );
  } catch (err) {
    console.error("[asset upload commit] failed:", err);
    await rollback();
    return NextResponse.json(
      { error: "Could not save asset. Please try again." },
      { status: 500 }
    );
  }
}

