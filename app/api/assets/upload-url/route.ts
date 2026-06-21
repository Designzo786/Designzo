import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { r2SignedPutUrl, r2PublicUrl } from "@/lib/r2";
import { flags } from "@/lib/env";
import { EXTENSIONS_BY_TYPE, getExtension } from "@/lib/upload-validation";
import type { FileType } from "@prisma/client";

export const runtime = "nodejs";

// Same ceilings the server-side validation enforced on the legacy
// multipart route. The signed URL doesn't contain a server-enforced size
// limit on its own — we trust the limit here at issue time and then
// double-check the actual object size via HeadObject when /api/assets
// commits the upload.
const MAX_PREVIEW_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_LOTTIE_GIF_BYTES = 15 * 1024 * 1024;
const MAX_LOTTIE_MP4_BYTES = 25 * 1024 * 1024;
const MAX_MODEL_FBX_BYTES = 30 * 1024 * 1024;
const MAX_MODEL_OBJ_BYTES = 20 * 1024 * 1024;
const MAX_MODEL_USDZ_BYTES = 20 * 1024 * 1024;
// .blend files often carry packed textures + simulation caches — keep
// the ceiling generous so legit Blender saves go through, but cap at
// the same 50 MB ceiling Vercel's hobby request payload caps imply
// elsewhere so a stray multi-GB save isn't accepted.
const MAX_MODEL_BLEND_BYTES = 50 * 1024 * 1024;
// PNG renders (the buyer-facing icon thumb or a hero shot) should be
// modest — anything bigger than 8 MB is overkill for a 2D companion
// and would dwarf the preview image itself.
const MAX_MODEL_PNG_BYTES = 8 * 1024 * 1024;

const PREVIEW_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];

const VALID_FILE_TYPES: FileType[] = [
  "MODEL_3D" as FileType,
  "LOTTIE" as FileType,
  "SVG_ICON" as FileType,
];

// Companion slot definitions. Each slot is gated by which parent fileType
// it's valid under, so an SVG_ICON upload can't request a Lottie GIF
// signed URL to slip past validation.
interface SlotSpec {
  /** Storage class — drives public vs private R2 path. */
  visibility: "public" | "private";
  /** Allowed extensions for the file landing in this slot. */
  extensions: string[];
  /** Hard max byte ceiling. */
  maxBytes: number;
  /** Parent fileTypes that may request this slot. */
  validFor: Array<FileType | "*">;
  /** R2 path prefix. {userId} is substituted at issue time. */
  prefix: string;
}

// Pack-item slot names follow the convention `packItem<N>` for the
// required .glb / .gltf, plus `packItem<N>Png` and `packItem<N>Blend`
// for the optional per-item companions. Auto-paired by basename at the
// upload form. Up to MAX_PACK_ITEMS items per listing — the limit
// keeps the slot manifest reasonable and stops a runaway client from
// issuing thousands of URLs in one request.
const MAX_PACK_ITEMS = 60;
const PACK_ITEM_SLOT_PREFIX = "packItem";
const PACK_ITEM_SPEC: SlotSpec = {
  visibility: "private",
  extensions: ["glb", "gltf"],
  maxBytes: MAX_FILE_BYTES, // same 100 MB cap as the main `file` slot
  validFor: ["MODEL_3D" as FileType],
  prefix: "private/files",
};
const PACK_ITEM_PNG_SPEC: SlotSpec = {
  // Public so the detail-page slider can render the thumbnail without
  // proxying through the server. Same path family as `modelKey` for
  // 3D assets.
  visibility: "public",
  extensions: ["png"],
  maxBytes: MAX_MODEL_PNG_BYTES,
  validFor: ["MODEL_3D" as FileType],
  prefix: "public/pack-thumbs",
};
const PACK_ITEM_BLEND_SPEC: SlotSpec = {
  visibility: "private",
  extensions: ["blend"],
  maxBytes: MAX_MODEL_BLEND_BYTES,
  validFor: ["MODEL_3D" as FileType],
  prefix: "private/files",
};

/**
 * Recognise the three pack-item slot families and return the matching
 * spec, or null if the slot name doesn't follow the convention.
 *
 *   packItem<N>       → glb/gltf (the icon itself)
 *   packItem<N>Png    → png companion (slider thumbnail)
 *   packItem<N>Blend  → blender source companion
 */
function packItemSpec(slotName: string): SlotSpec | null {
  if (!slotName.startsWith(PACK_ITEM_SLOT_PREFIX)) return null;
  // Strip the prefix to inspect the tail.
  const tail = slotName.slice(PACK_ITEM_SLOT_PREFIX.length);

  // Companion-suffix variants first since they're more specific.
  const matchPng = tail.match(/^(\d+)Png$/);
  if (matchPng) {
    const idx = Number(matchPng[1]);
    if (idx >= 0 && idx < MAX_PACK_ITEMS) return PACK_ITEM_PNG_SPEC;
    return null;
  }
  const matchBlend = tail.match(/^(\d+)Blend$/);
  if (matchBlend) {
    const idx = Number(matchBlend[1]);
    if (idx >= 0 && idx < MAX_PACK_ITEMS) return PACK_ITEM_BLEND_SPEC;
    return null;
  }

  // Bare packItem<N> → required .glb / .gltf
  const idx = Number(tail);
  if (Number.isInteger(idx) && idx >= 0 && idx < MAX_PACK_ITEMS) {
    return PACK_ITEM_SPEC;
  }
  return null;
}

/** True only for the bare packItem<N> slot — used to know whether
 *  the per-fileType extension allowlist should apply (it does for the
 *  primary .glb, not for the .png / .blend companions). */
function isPackItemPrimarySlot(slotName: string): boolean {
  if (!slotName.startsWith(PACK_ITEM_SLOT_PREFIX)) return false;
  const tail = slotName.slice(PACK_ITEM_SLOT_PREFIX.length);
  const idx = Number(tail);
  return Number.isInteger(idx) && idx >= 0 && idx < MAX_PACK_ITEMS;
}

const SLOTS: Record<string, SlotSpec> = {
  file: {
    visibility: "private",
    // Wildcard — every fileType's allowlist is enforced separately below.
    extensions: ["glb", "gltf", "json", "lottie", "svg"],
    maxBytes: MAX_FILE_BYTES,
    validFor: ["*"],
    prefix: "private/files",
  },
  preview: {
    visibility: "public",
    extensions: PREVIEW_EXTENSIONS,
    maxBytes: MAX_PREVIEW_BYTES,
    validFor: ["*"],
    prefix: "public/previews",
  },
  lottieGif: {
    visibility: "private",
    extensions: ["gif"],
    maxBytes: MAX_LOTTIE_GIF_BYTES,
    validFor: ["LOTTIE" as FileType],
    prefix: "private/files",
  },
  lottieMp4: {
    visibility: "private",
    extensions: ["mp4"],
    maxBytes: MAX_LOTTIE_MP4_BYTES,
    validFor: ["LOTTIE" as FileType],
    prefix: "private/files",
  },
  modelFbx: {
    visibility: "private",
    extensions: ["fbx"],
    maxBytes: MAX_MODEL_FBX_BYTES,
    validFor: ["MODEL_3D" as FileType],
    prefix: "private/files",
  },
  modelObj: {
    visibility: "private",
    extensions: ["obj"],
    maxBytes: MAX_MODEL_OBJ_BYTES,
    validFor: ["MODEL_3D" as FileType],
    prefix: "private/files",
  },
  modelUsdz: {
    visibility: "private",
    extensions: ["usdz"],
    maxBytes: MAX_MODEL_USDZ_BYTES,
    validFor: ["MODEL_3D" as FileType],
    prefix: "private/files",
  },
  modelBlend: {
    visibility: "private",
    extensions: ["blend"],
    maxBytes: MAX_MODEL_BLEND_BYTES,
    validFor: ["MODEL_3D" as FileType],
    prefix: "private/files",
  },
  modelPng: {
    visibility: "private",
    extensions: ["png"],
    maxBytes: MAX_MODEL_PNG_BYTES,
    validFor: ["MODEL_3D" as FileType],
    prefix: "private/files",
  },
};

function contentTypeFor(ext: string): string {
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "glb":
      return "model/gltf-binary";
    case "gltf":
      return "model/gltf+json";
    case "json":
      return "application/json";
    case "lottie":
    case "usdz":
      return "application/zip";
    case "mp4":
      return "video/mp4";
    default:
      return "application/octet-stream";
  }
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
}

interface SlotRequest {
  name: string;
  size: number;
}

interface SlotResponse {
  key: string;
  url: string;
  /** Browser-readable URL for public slots only (preview). */
  publicUrl?: string;
  contentType: string;
  expiresIn: number;
}

/**
 * Issue pre-signed PUT URLs the browser can use to upload assets directly
 * to R2 — bypassing Vercel's 4.5 MB serverless body-size limit. Every slot
 * is validated server-side (extension, size, parent fileType) before any
 * URL is issued, so a tampered client can't sneak forbidden files into
 * the bucket.
 *
 * Request:
 *   POST /api/assets/upload-url
 *   {
 *     "fileType": "MODEL_3D" | "LOTTIE" | "SVG_ICON",
 *     "slots": {
 *       "file":     { "name": "model.glb",  "size": 12500000 },
 *       "preview":  { "name": "thumb.png",  "size":   850000 },
 *       "modelFbx": { "name": "model.fbx",  "size": 25000000 }
 *     }
 *   }
 *
 * Response:
 *   {
 *     "slots": {
 *       "file":     { "key": "...", "url": "https://...presigned-PUT...", "contentType": "..." },
 *       "preview":  { "key": "...", "url": "...", "publicUrl": "https://pub-...", "contentType": "..." },
 *       ...
 *     },
 *     "expiresIn": 300
 *   }
 *
 * The browser then PUTs each file to its `url` with the matching
 * Content-Type header. Once every PUT succeeds it POSTs the returned
 * `key` values to /api/assets along with the asset metadata.
 */
export async function POST(req: Request) {
  if (!flags.hasR2) {
    return NextResponse.json(
      { error: "Storage isn't configured. R2 credentials missing." },
      { status: 503 }
    );
  }

  // 60/hr/IP is generous for legit creators iterating on an upload form
  // while still capping abuse — each request only issues URLs, not actual
  // storage, but R2 PUTs are billable so we don't want runaway clients.
  const rl = checkRateLimit(req, "asset-upload-url", {
    limit: 60,
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const obj = body as {
    fileType?: string;
    slots?: Record<string, SlotRequest>;
  };

  const fileType = String(obj.fileType ?? "").trim() as FileType;
  if (!VALID_FILE_TYPES.includes(fileType)) {
    return NextResponse.json(
      { error: "Invalid file type." },
      { status: 400 }
    );
  }

  const requested = obj.slots ?? {};
  if (typeof requested !== "object" || !requested.file) {
    return NextResponse.json(
      { error: "The `file` slot is required." },
      { status: 400 }
    );
  }
  // Preview is optional only for LOTTIE — the Lottie animation itself
  // doubles as the listing thumbnail (the public-viewer copy of the
  // .json is reused as `previewKey` server-side). Every other fileType
  // still needs a still-image preview for buyers scanning listings.
  if (fileType !== ("LOTTIE" as FileType) && !requested.preview) {
    return NextResponse.json(
      { error: "The `preview` slot is required for this asset type." },
      { status: 400 }
    );
  }

  // Per-fileType extension allowlist for the main `file` slot — same
  // strict mapping the legacy multipart route enforced.
  const fileAllowList = EXTENSIONS_BY_TYPE[fileType] ?? [];

  const out: Record<string, SlotResponse> = {};
  const userId = session.user.id;

  for (const [slotName, req] of Object.entries(requested)) {
    // packItem<N>, packItem<N>Png, and packItem<N>Blend slots all share
    // the dynamic pack-item spec lookup — handled outside the SLOTS map
    // so the form can request any number of items up to MAX_PACK_ITEMS
    // without each one needing a hard-coded entry.
    const spec = SLOTS[slotName] ?? packItemSpec(slotName);
    if (!spec) {
      return NextResponse.json(
        { error: `Unknown upload slot: ${slotName}.` },
        { status: 400 }
      );
    }

    // Parent fileType gate — protects against a tampered client requesting
    // a Lottie companion URL during an SVG_ICON upload, etc.
    if (
      !spec.validFor.includes("*") &&
      !spec.validFor.includes(fileType)
    ) {
      return NextResponse.json(
        {
          error: `Slot "${slotName}" isn't valid for the chosen file type.`,
        },
        { status: 400 }
      );
    }

    if (!req || typeof req.name !== "string" || typeof req.size !== "number") {
      return NextResponse.json(
        { error: `Slot "${slotName}" is missing name/size.` },
        { status: 400 }
      );
    }

    if (!Number.isFinite(req.size) || req.size <= 0) {
      return NextResponse.json(
        { error: `Slot "${slotName}" has an invalid size.` },
        { status: 400 }
      );
    }
    if (req.size > spec.maxBytes) {
      return NextResponse.json(
        {
          error: `${slotName} exceeds its ${Math.round(spec.maxBytes / (1024 * 1024))} MB limit.`,
        },
        { status: 400 }
      );
    }

    const ext = getExtension(req.name);
    // For the main `file` slot AND each primary pack-item slot
    // (packItem<N>, NOT the Png/Blend companions), the allowlist is
    // per-fileType (.glb / .gltf for MODEL_3D). Every other slot's
    // allowlist is fixed (preview = images, modelFbx = fbx only,
    // packItem<N>Png = png only, packItem<N>Blend = blend only).
    const allowed =
      slotName === "file" || isPackItemPrimarySlot(slotName)
        ? fileAllowList
        : spec.extensions;
    if (!allowed.includes(ext)) {
      return NextResponse.json(
        {
          error: `${slotName} extension ".${ext}" isn't allowed. Accepted: ${allowed
            .map((e) => `.${e}`)
            .join(", ")}.`,
        },
        { status: 400 }
      );
    }

    // 16 hex chars is enough to make collisions astronomically unlikely
    // while keeping the key short for logging / debugging.
    const nonce = randomBytes(8).toString("hex");
    const key = `${spec.prefix}/${userId}/${nonce}-${safeFilename(req.name)}`;
    const contentType = contentTypeFor(ext);
    const url = await r2SignedPutUrl(key, {
      contentType,
      expiresInSeconds: 300,
    });

    out[slotName] = {
      key,
      url,
      contentType,
      expiresIn: 300,
      ...(spec.visibility === "public"
        ? { publicUrl: r2PublicUrl(key) }
        : {}),
    };
  }

  return NextResponse.json({ slots: out, expiresIn: 300 });
}
