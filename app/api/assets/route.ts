import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savePublic, savePrivate, deletePublic, deletePrivate } from "@/lib/storage";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  validateAssetFile,
  validatePreviewImage,
  validateLottieGif,
  validateLottieMp4,
} from "@/lib/upload-validation";
import type { FileType } from "@prisma/client";

export const runtime = "nodejs";

const MAX_PREVIEW_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB
// Lottie companion limits chosen so a typical bundle (JSON + GIF + MP4)
// stays under ~30MB total — comfortable for in-memory ZIP generation at
// download time without streaming.
const MAX_LOTTIE_GIF_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_LOTTIE_MP4_BYTES = 25 * 1024 * 1024; // 25 MB

// Cast widens to include LOTTIE while the locally-generated Prisma client
// is one `prisma generate` behind the schema. LOTTIE is in the DB enum and
// the schema already; this just keeps TypeScript happy until the client
// regenerates cleanly (after the next dev-server restart).
const VALID_FILE_TYPES = [
  "MODEL_3D",
  "MATERIAL",
  "LOTTIE",
  "SVG_ICON",
] as FileType[];

const VALID_CATEGORIES = [
  "3d-models",
  "3d-icons",
  "lottie",
  "svg-icons",
  "materials",
];

export async function POST(req: Request) {
  // 20 uploads per hour per IP — generous for legitimate creators, hard
  // ceiling against abuse since each upload writes 100MB+ to storage.
  const rl = checkRateLimit(req, "asset-upload", {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Only Collaborator (CREATOR) and ADMIN accounts may upload. Plain USER
  // accounts are buy-only — reject server-side so a hidden nav tab can't be
  // bypassed by posting directly to this endpoint.
  if (session.user.role === "USER") {
    return NextResponse.json(
      {
        error:
          "Your account type can't upload assets. Register as a Collaborator to sell.",
      },
      { status: 403 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not parse upload." },
      { status: 400 }
    );
  }

  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  const fileType = String(form.get("fileType") ?? "").trim() as FileType;
  const tagsRaw = String(form.get("tags") ?? "").trim();
  const priceCentsRaw = String(form.get("priceCents") ?? "0").trim();

  const file = form.get("file");
  const preview = form.get("preview");
  // Optional Lottie companion uploads — only consulted when fileType is LOTTIE.
  const lottieGif = form.get("lottieGif");
  const lottieMp4 = form.get("lottieMp4");

  // ─── Validation ───────────────────────────────────────────────────────────

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
    return NextResponse.json(
      { error: "Invalid category." },
      { status: 400 }
    );
  }
  if (!VALID_FILE_TYPES.includes(fileType)) {
    return NextResponse.json(
      { error: "Invalid file type." },
      { status: 400 }
    );
  }

  const priceCents = Number(priceCentsRaw);
  if (!Number.isInteger(priceCents) || priceCents < 0 || priceCents > 999999) {
    return NextResponse.json(
      { error: "Price must be a whole number of paise (0–999999)." },
      { status: 400 }
    );
  }
  // Razorpay's minimum order is ₹1 (100 paise). Anything in (0, 100) would
  // pass our validation here only to fail at checkout time. Reject up-front so
  // the creator can't accidentally publish an unsellable price.
  if (priceCents > 0 && priceCents < 100) {
    return NextResponse.json(
      { error: "Price must be either 0 (free) or at least ₹1 (100 paise)." },
      { status: 400 }
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Asset file is required." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `Asset file exceeds 100 MB limit.` },
      { status: 400 }
    );
  }

  if (!(preview instanceof File) || preview.size === 0) {
    return NextResponse.json(
      { error: "Preview image is required." },
      { status: 400 }
    );
  }
  if (preview.size > MAX_PREVIEW_BYTES) {
    return NextResponse.json(
      { error: "Preview image exceeds 5 MB limit." },
      { status: 400 }
    );
  }

  // ─── Strong content validation ────────────────────────────────────────────
  // Read both files once — the buffers are reused below for saving. Magic-byte
  // checks verify the file's actual contents, not just its extension, so a
  // renamed executable or a mismatched format is rejected here.
  const fileBuf = Buffer.from(await file.arrayBuffer());
  const previewBuf = Buffer.from(await preview.arrayBuffer());

  const fileCheck = validateAssetFile(file.name, fileType, fileBuf);
  if (!fileCheck.ok) {
    return NextResponse.json({ error: fileCheck.error }, { status: 400 });
  }

  const previewCheck = validatePreviewImage(
    preview.name,
    preview.type,
    previewBuf
  );
  if (!previewCheck.ok) {
    return NextResponse.json({ error: previewCheck.error }, { status: 400 });
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

  // ─── Save files ───────────────────────────────────────────────────────────

  let savedPreviewUrl: string | null = null;
  let savedFileKey: string | null = null;
  let savedModelUrl: string | null = null;
  // Lottie bundle companions — only used when fileType === LOTTIE.
  let savedLottieGifKey: string | null = null;
  let savedLottieMp4Key: string | null = null;

  try {
    const previewSaved = await savePublic(
      `previews/${session.user.id}`,
      preview.name || "preview.png",
      previewBuf
    );
    savedPreviewUrl = previewSaved.url;

    // If the asset itself is browser-renderable (3D glTF, Lottie JSON,
    // dotLottie ZIP, or SVG), ALSO save a publicly-readable copy so the
    // viewer on the detail page can fetch it. The private fileKey is
    // still what gets gated for paid downloads — this is just a render
    // source. Buyers/visitors only see the public copy; the private file
    // is the one they download after purchase.
    const fileExt = (file.name.split(".").pop() ?? "").toLowerCase();
    const PUBLIC_VIEWER_EXTENSIONS = ["glb", "gltf", "json", "lottie", "svg"];
    if (PUBLIC_VIEWER_EXTENSIONS.includes(fileExt)) {
      const modelSaved = await savePublic(
        `models/${session.user.id}`,
        file.name || `asset.${fileExt}`,
        fileBuf
      );
      savedModelUrl = modelSaved.url;
    }

    const fileSaved = await savePrivate(
      `files/${session.user.id}`,
      file.name || "asset",
      fileBuf
    );
    savedFileKey = fileSaved.key;

    // ── Lottie bundle companions ─────────────────────────────────────────
    // Validate + persist only when the declared type is LOTTIE. Both fields
    // are optional — a Lottie upload may ship JSON-only or with one/both
    // companion formats. Each lives in private storage so it can only be
    // reached through the gated /api/assets/:id/download endpoint.
    let totalBundleBytes = fileSaved.bytes;
    if (fileType === "LOTTIE") {
      if (lottieGif instanceof File && lottieGif.size > 0) {
        if (lottieGif.size > MAX_LOTTIE_GIF_BYTES) {
          await deletePublic(savedPreviewUrl);
          if (savedModelUrl) await deletePublic(savedModelUrl);
          await deletePrivate(savedFileKey);
          return NextResponse.json(
            { error: `Lottie GIF companion exceeds 15 MB limit.` },
            { status: 400 }
          );
        }
        const gifBuf = Buffer.from(await lottieGif.arrayBuffer());
        const gifCheck = validateLottieGif(lottieGif.name, gifBuf);
        if (!gifCheck.ok) {
          await deletePublic(savedPreviewUrl);
          if (savedModelUrl) await deletePublic(savedModelUrl);
          await deletePrivate(savedFileKey);
          return NextResponse.json(
            { error: gifCheck.error },
            { status: 400 }
          );
        }
        const gifSaved = await savePrivate(
          `files/${session.user.id}`,
          lottieGif.name || "animation.gif",
          gifBuf
        );
        savedLottieGifKey = gifSaved.key;
        totalBundleBytes += gifSaved.bytes;
      }

      if (lottieMp4 instanceof File && lottieMp4.size > 0) {
        if (lottieMp4.size > MAX_LOTTIE_MP4_BYTES) {
          await deletePublic(savedPreviewUrl);
          if (savedModelUrl) await deletePublic(savedModelUrl);
          await deletePrivate(savedFileKey);
          if (savedLottieGifKey) await deletePrivate(savedLottieGifKey);
          return NextResponse.json(
            { error: `Lottie MP4 companion exceeds 25 MB limit.` },
            { status: 400 }
          );
        }
        const mp4Buf = Buffer.from(await lottieMp4.arrayBuffer());
        const mp4Check = validateLottieMp4(lottieMp4.name, mp4Buf);
        if (!mp4Check.ok) {
          await deletePublic(savedPreviewUrl);
          if (savedModelUrl) await deletePublic(savedModelUrl);
          await deletePrivate(savedFileKey);
          if (savedLottieGifKey) await deletePrivate(savedLottieGifKey);
          return NextResponse.json(
            { error: mp4Check.error },
            { status: 400 }
          );
        }
        const mp4Saved = await savePrivate(
          `files/${session.user.id}`,
          lottieMp4.name || "animation.mp4",
          mp4Buf
        );
        savedLottieMp4Key = mp4Saved.key;
        totalBundleBytes += mp4Saved.bytes;
      }
    }

    const asset = await prisma.asset.create({
      data: {
        title,
        description,
        category,
        tags,
        fileType,
        price: priceCents,
        previewKey: savedPreviewUrl,
        fileKey: savedFileKey,
        modelKey: savedModelUrl,
        lottieGifKey: savedLottieGifKey,
        lottieMp4Key: savedLottieMp4Key,
        fileSizeBytes: totalBundleBytes,
        uploaderId: session.user.id,
        // status defaults to PENDING — admin moderation queue picks it up
      },
      select: { id: true, status: true },
    });

    return NextResponse.json(
      { id: asset.id, status: asset.status },
      { status: 201 }
    );
  } catch (err) {
    // Roll back any files we wrote so we don't leak orphaned blobs
    if (savedPreviewUrl) await deletePublic(savedPreviewUrl);
    if (savedModelUrl) await deletePublic(savedModelUrl);
    if (savedFileKey) await deletePrivate(savedFileKey);
    if (savedLottieGifKey) await deletePrivate(savedLottieGifKey);
    if (savedLottieMp4Key) await deletePrivate(savedLottieMp4Key);

    console.error("[asset upload] failed:", err);
    return NextResponse.json(
      { error: "Could not save asset. Please try again." },
      { status: 500 }
    );
  }
}
