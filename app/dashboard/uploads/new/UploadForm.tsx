"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  X,
  Image as ImageIcon,
  FileBox,
  Film,
  ImagePlay,
  Boxes,
  Box,
  Check,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { CATEGORIES, FILE_TYPES, subcategoriesFor } from "@/lib/mock/assets";
import { EXTENSIONS_BY_TYPE, getExtension } from "@/lib/upload-validation";
import { formatFileSize } from "@/lib/utils";
import type { FileType } from "@prisma/client";

const MAX_PREVIEW_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
// Companion limits — kept in sync with the server-side ceilings in
// /api/assets so the client surfaces the right error before upload.
const MAX_LOTTIE_GIF_BYTES = 15 * 1024 * 1024;
const MAX_LOTTIE_MP4_BYTES = 25 * 1024 * 1024;
const MAX_MODEL_FBX_BYTES = 30 * 1024 * 1024;
const MAX_MODEL_OBJ_BYTES = 20 * 1024 * 1024;
const MAX_MODEL_USDZ_BYTES = 20 * 1024 * 1024;

// MIME types paired with each accepted extension. Mobile file pickers
// (especially iOS) gate "selectable" files by MIME type, so the accept
// attribute needs both `.json` AND `application/json` for the user to
// actually be able to pick a .json file from their Files app. Only the
// few extensions where this matters are listed — everything else still
// passes via the bare `.ext` form.
const EXT_TO_MIME: Record<string, string> = {
  json: "application/json",
  lottie: "application/zip",
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  svg: "image/svg+xml",
  zip: "application/zip",
};

interface SlotSpec {
  /** Logical slot name on the server (file / preview / lottieGif / ...) */
  slot: string;
  /** The actual File the browser will PUT to the signed URL. */
  file: File;
}

interface SignedSlot {
  key: string;
  url: string;
  publicUrl?: string;
  contentType: string;
  expiresIn: number;
}

interface SignedUrlResponse {
  slots: Record<string, SignedSlot>;
  expiresIn: number;
}

/**
 * PUT a single File to R2 via the signed URL. XHR is used (not fetch)
 * because we need the upload-progress event to drive the form's progress
 * bar — fetch() can't surface that yet.
 *
 * R2 rejects the PUT if the Content-Type doesn't match what the signed
 * URL was issued with, so we always set it from the server's response.
 */
function putToSignedUrl(
  url: string,
  contentType: string,
  file: File,
  onChunk: (loaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onChunk(e.loaded, e.total);
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        // R2 returns an XML body on failure — we don't try to parse it;
        // the HTTP status alone is enough context for a clear retry.
        reject(
          new Error(
            `Upload to storage failed (HTTP ${xhr.status}). ${xhr.statusText || ""}`.trim()
          )
        );
      }
    });
    xhr.addEventListener("error", () =>
      // The XHR error event fires with no detail when a CORS preflight
      // is rejected, the network drops mid-PUT, or the signed URL host
      // is unreachable. Of those, CORS is by far the most common cause
      // in production — surface that hint so the operator knows where
      // to look first instead of chasing a phantom network issue.
      reject(
        new Error(
          "Could not reach storage. If this is the first upload after a deploy, the R2 bucket may be missing its CORS rules — see scripts/setup-r2-cors.mjs or the Cloudflare R2 dashboard."
        )
      )
    );
    xhr.addEventListener("abort", () =>
      reject(new Error("Upload was cancelled."))
    );
    xhr.send(file);
  });
}

/**
 * Translate a non-2xx JSON response from one of our own routes into a
 * useful error string. Falls back to a status-code-specific message when
 * the server returned no error body (e.g. an edge layer 413 / 504 / 502).
 */
async function readJsonError(
  res: Response,
  fallbackByStatus: Record<number, string> = {}
): Promise<string> {
  let body: { error?: string } = {};
  try {
    body = await res.json();
  } catch {
    // not JSON
  }
  if (body.error) return body.error;
  if (fallbackByStatus[res.status]) return fallbackByStatus[res.status];
  if (res.status === 413)
    return "That file is too large for the current upload limit.";
  if (res.status === 504)
    return "Upload timed out. Try a smaller file or a faster connection.";
  if (res.status === 401)
    return "Your session expired — please sign in again.";
  return `Upload failed (HTTP ${res.status}). Please try again.`;
}

// Each category maps to its natural file type. When the user picks a
// category, we auto-flip the file-type selector to match so they don't
// have to think about it — a buyer-friendly upload UX where the form
// stays in sync with what makes sense.
const CATEGORY_TO_FILE_TYPE: Record<string, string> = {
  "3d-models": "MODEL_3D",
  "3d-icons": "MODEL_3D",
  lottie: "LOTTIE",
  "svg-icons": "SVG_ICON",
};

// Inverse map — when a creator drops a file we infer the file type from
// the extension and snap the category to the matching slug. Default
// category for MODEL_3D is "3d-models" rather than "3d-icons" because
// the average .glb upload is a full model, not an icon.
const FILE_TYPE_TO_DEFAULT_CATEGORY: Record<string, string> = {
  MODEL_3D: "3d-models",
  LOTTIE: "lottie",
  SVG_ICON: "svg-icons",
};

const EXTENSION_TO_FILE_TYPE: Record<string, string> = {
  glb: "MODEL_3D",
  gltf: "MODEL_3D",
  json: "LOTTIE",
  lottie: "LOTTIE",
  svg: "SVG_ICON",
};

/**
 * Turn `crystal-octahedron_pack.glb` into `Crystal Octahedron Pack`.
 * Used to pre-fill the title field when the creator picks a file and
 * the title is still empty — saves them a typing step.
 */
function humanizeFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .slice(0, 100);
}

// Per-file-type guidance shown right under the file-picker so creators know
// exactly what to upload and what each format does.
const FILE_TYPE_HINTS: Record<string, { what: string; note: string }> = {
  MODEL_3D: {
    what: "Upload a .glb or .gltf file from Blender, Maya, 3ds Max, or any glTF exporter. You can optionally add FBX, OBJ, and USDZ exports — buyers pick the format they need at download time.",
    note: "Buyers see a live 3D preview rendered with Three.js, then download the format that matches their target engine.",
  },
  LOTTIE: {
    what: "Upload a Bodymovin .json or a packed .lottie animation from LottieFiles or After Effects. You can optionally add GIF + MP4 renders of the same animation — buyers download all formats as a single ZIP bundle.",
    note: "The bundle automatically ships with a per-buyer LICENSE.txt that records the purchase, license type, and scope of use.",
  },
  SVG_ICON: {
    what: "Upload a single .svg icon. Scripts and event handlers are blocked at validation for security.",
    note: "Re-export from Figma/Sketch/Illustrator as plain SVG with no JS or external references.",
  },
};

export function UploadForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0].slug);
  // Sub-category dropdown — optional, blank by default. Cleared whenever
  // the parent category changes so a stale slug from a different category
  // can never reach the server.
  const [subcategory, setSubcategory] = useState<string>("");
  const [fileType, setFileType] = useState<string>(
    CATEGORY_TO_FILE_TYPE[CATEGORIES[0].slug] ?? FILE_TYPES[0].slug
  );

  // Per-category sub-category options. Re-derived on every render — the
  // SUBCATEGORIES map is static so this is just a constant lookup.
  const subcategoryOptions = subcategoriesFor(category);
  const [priceInr, setPriceInr] = useState("0");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Optional Lottie companion uploads — surfaced only when fileType === LOTTIE.
  const [lottieGif, setLottieGif] = useState<File | null>(null);
  const [lottieMp4, setLottieMp4] = useState<File | null>(null);
  // Optional 3D companion uploads — surfaced only when fileType === MODEL_3D.
  const [modelFbx, setModelFbx] = useState<File | null>(null);
  const [modelObj, setModelObj] = useState<File | null>(null);
  const [modelUsdz, setModelUsdz] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const lottieGifRef = useRef<HTMLInputElement>(null);
  const lottieMp4Ref = useRef<HTMLInputElement>(null);
  const modelFbxRef = useRef<HTMLInputElement>(null);
  const modelObjRef = useRef<HTMLInputElement>(null);
  const modelUsdzRef = useRef<HTMLInputElement>(null);

  // Extensions valid for the currently-selected file type. Drives both the
  // file picker's `accept` filter and the instant validation below.
  // For each extension we ALSO emit the matching MIME type — some mobile
  // file pickers (iOS Safari, Chrome Android) refuse otherwise-valid files
  // when the accept attribute is extension-only. Most notably .json on
  // iOS — the OS file roll only enables files matching `application/json`,
  // not just `.json`.
  const allowedExtensions = EXTENSIONS_BY_TYPE[fileType as FileType] ?? [];
  const fileAccept = allowedExtensions
    .flatMap((e) => {
      const exts = [`.${e}`];
      const mime = EXT_TO_MIME[e];
      if (mime) exts.push(mime);
      return exts;
    })
    .join(",");
  const allowedLabel = allowedExtensions.map((e) => `.${e}`).join(", ");

  /**
   * Accept an incoming asset file from either the <input> change event
   * or a drag-and-drop. Auto-detects the file type from the extension so
   * the creator doesn't have to manually flip the Category / File-type
   * selectors, AND auto-fills the title from the filename if it's still
   * blank. The form stays editable — anything we infer is just a sensible
   * default, the user can override.
   */
  function pickAssetFile(f: File): void {
    const ext = getExtension(f.name);

    // If the extension cleanly maps to a known file type, snap the form
    // to it BEFORE running the per-type validation. That way dropping a
    // .json file into the form while it's still set to MODEL_3D (the
    // default) re-targets it to LOTTIE instead of rejecting it.
    const detectedType = EXTENSION_TO_FILE_TYPE[ext];
    if (detectedType && detectedType !== fileType) {
      setFileType(detectedType);
      const defaultCategory = FILE_TYPE_TO_DEFAULT_CATEGORY[detectedType];
      if (defaultCategory && defaultCategory !== category) {
        setCategory(defaultCategory);
        setSubcategory(""); // category changed → stale subcategory
      }
    }

    // Re-derive the allowed list based on the (possibly just-flipped)
    // file type so a freshly-detected file still passes validation.
    const allowedAfterDetect =
      EXTENSIONS_BY_TYPE[(detectedType ?? fileType) as FileType] ?? [];
    if (!allowedAfterDetect.includes(ext)) {
      setError(
        `A ".${ext}" file isn't valid for this asset type. Accepted: ${allowedAfterDetect.map((e) => `.${e}`).join(", ")}.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setError(`Asset file is too large (max ${formatFileSize(MAX_FILE_BYTES)}).`);
      return;
    }
    setError(null);
    setFile(f);

    // Auto-fill title from filename if the creator hasn't typed anything.
    // Respect their input if they already started — don't overwrite.
    if (title.trim().length === 0) {
      const suggested = humanizeFilename(f.name);
      if (suggested) setTitle(suggested);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    pickAssetFile(f);
  }

  // Changing the file type can invalidate an already-picked file — drop it
  // so the user can't submit a mismatched pair.
  function onFileTypeChange(next: string) {
    setFileType(next);
    if (file) {
      const allowed = EXTENSIONS_BY_TYPE[next as FileType] ?? [];
      if (!allowed.includes(getExtension(file.name))) {
        clearFile();
        setError(
          "Your selected file no longer matches the chosen file type — please pick another."
        );
      }
    }
    // Drop Lottie companions when switching to a non-Lottie type — they
    // wouldn't make sense for, say, a MODEL_3D asset.
    if (next !== "LOTTIE") {
      clearLottieGif();
      clearLottieMp4();
    }
    // Same for the 3D format companions — only relevant for MODEL_3D.
    if (next !== "MODEL_3D") {
      clearModelFbx();
      clearModelObj();
      clearModelUsdz();
    }
  }

  function onLottieGifChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (getExtension(f.name) !== "gif") {
      setError("Lottie GIF companion must be a .gif file.");
      if (lottieGifRef.current) lottieGifRef.current.value = "";
      return;
    }
    if (f.size > MAX_LOTTIE_GIF_BYTES) {
      setError(
        `GIF companion is too large (max ${formatFileSize(MAX_LOTTIE_GIF_BYTES)}).`
      );
      if (lottieGifRef.current) lottieGifRef.current.value = "";
      return;
    }
    setError(null);
    setLottieGif(f);
  }

  function onLottieMp4Change(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (getExtension(f.name) !== "mp4") {
      setError("Lottie MP4 companion must be a .mp4 file.");
      if (lottieMp4Ref.current) lottieMp4Ref.current.value = "";
      return;
    }
    if (f.size > MAX_LOTTIE_MP4_BYTES) {
      setError(
        `MP4 companion is too large (max ${formatFileSize(MAX_LOTTIE_MP4_BYTES)}).`
      );
      if (lottieMp4Ref.current) lottieMp4Ref.current.value = "";
      return;
    }
    setError(null);
    setLottieMp4(f);
  }

  function clearLottieGif() {
    setLottieGif(null);
    if (lottieGifRef.current) lottieGifRef.current.value = "";
  }

  function clearLottieMp4() {
    setLottieMp4(null);
    if (lottieMp4Ref.current) lottieMp4Ref.current.value = "";
  }

  // ── 3D model companion handlers ───────────────────────────────────────
  // Each accepts exactly one extension and one matching MIME type so the
  // mobile file picker actually allows the file. Same pattern as the
  // Lottie companions: validate extension + size, set the file, clear on
  // mismatch.
  function makeCompanionHandler(
    expectedExt: string,
    maxBytes: number,
    label: string,
    setFile: (f: File | null) => void,
    refObj: React.RefObject<HTMLInputElement | null>
  ) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (getExtension(f.name) !== expectedExt) {
        setError(`${label} must be a .${expectedExt} file.`);
        if (refObj.current) refObj.current.value = "";
        return;
      }
      if (f.size > maxBytes) {
        setError(
          `${label} is too large (max ${formatFileSize(maxBytes)}).`
        );
        if (refObj.current) refObj.current.value = "";
        return;
      }
      setError(null);
      setFile(f);
    };
  }

  const onModelFbxChange = makeCompanionHandler(
    "fbx",
    MAX_MODEL_FBX_BYTES,
    "FBX companion",
    setModelFbx,
    modelFbxRef
  );
  const onModelObjChange = makeCompanionHandler(
    "obj",
    MAX_MODEL_OBJ_BYTES,
    "OBJ companion",
    setModelObj,
    modelObjRef
  );
  const onModelUsdzChange = makeCompanionHandler(
    "usdz",
    MAX_MODEL_USDZ_BYTES,
    "USDZ companion",
    setModelUsdz,
    modelUsdzRef
  );

  function clearModelFbx() {
    setModelFbx(null);
    if (modelFbxRef.current) modelFbxRef.current.value = "";
  }
  function clearModelObj() {
    setModelObj(null);
    if (modelObjRef.current) modelObjRef.current.value = "";
  }
  function clearModelUsdz() {
    setModelUsdz(null);
    if (modelUsdzRef.current) modelUsdzRef.current.value = "";
  }

  // Picking a category auto-flips the file-type selector to whatever
  // natural type it expects (lottie -> LOTTIE, svg-icons -> SVG_ICON, etc.)
  // The user can still override the file-type manually afterwards if they
  // have a non-standard pairing in mind.
  function onCategoryChange(next: string) {
    setCategory(next);
    // The sub-category list is category-specific — a slug from the old
    // category won't be valid for the new one. Reset to blank so the
    // user re-picks deliberately.
    setSubcategory("");
    const suggested = CATEGORY_TO_FILE_TYPE[next];
    if (suggested && suggested !== fileType) {
      onFileTypeChange(suggested);
    }
  }

  function onPreviewChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Preview must be an image (PNG, JPEG, or WebP).");
      return;
    }
    if (f.size > MAX_PREVIEW_BYTES) {
      setError(`Preview is too large (max ${formatFileSize(MAX_PREVIEW_BYTES)}).`);
      return;
    }
    setError(null);
    setPreview(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function clearFile() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function clearPreview() {
    setPreview(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (previewInputRef.current) previewInputRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) return setError("Please select an asset file.");
    if (!preview) return setError("Please select a preview image.");

    // Final guard — the file extension must match the selected file type.
    const ext = getExtension(file.name);
    if (!allowedExtensions.includes(ext)) {
      return setError(
        `Your ".${ext}" file doesn't match the selected file type. Accepted: ${allowedLabel}.`
      );
    }

    const priceInrNum = Number(priceInr);
    if (!Number.isFinite(priceInrNum) || priceInrNum < 0) {
      return setError("Price must be 0 or higher.");
    }
    // Razorpay rejects any order under ₹1, so anything in (0, 1) would silently
    // fail at checkout. Block it at the form to keep the error close to where
    // the creator can fix it.
    if (priceInrNum > 0 && priceInrNum < 1) {
      return setError("Price must be either 0 (free) or at least ₹1.");
    }
    const priceCents = Math.round(priceInrNum * 100);

    setLoading(true);
    setProgress(0);

    // Build the full slot manifest — every File the browser needs to
    // upload, in declaration order. The server-side allowlist gates
    // which slots are permitted for each fileType so a tampered client
    // can't sneak unwanted companions into an SVG/Lottie upload.
    const slots: SlotSpec[] = [
      { slot: "file", file },
      { slot: "preview", file: preview },
    ];
    if (fileType === "LOTTIE") {
      if (lottieGif) slots.push({ slot: "lottieGif", file: lottieGif });
      if (lottieMp4) slots.push({ slot: "lottieMp4", file: lottieMp4 });
    }
    if (fileType === "MODEL_3D") {
      if (modelFbx) slots.push({ slot: "modelFbx", file: modelFbx });
      if (modelObj) slots.push({ slot: "modelObj", file: modelObj });
      if (modelUsdz) slots.push({ slot: "modelUsdz", file: modelUsdz });
    }

    try {
      // ─── Step 1: Ask the server for pre-signed PUT URLs ──────────────
      // The server validates extension + size + per-fileType slot gating
      // before issuing any URL, so an obvious mistake (wrong extension,
      // file too large) is caught BEFORE the browser uploads megabytes.
      const signRes = await fetch("/api/assets/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileType,
          slots: Object.fromEntries(
            slots.map((s) => [s.slot, { name: s.file.name, size: s.file.size }])
          ),
        }),
      });
      if (!signRes.ok) {
        setError(await readJsonError(signRes));
        setLoading(false);
        setProgress(0);
        return;
      }
      const signed = (await signRes.json()) as SignedUrlResponse;

      // ─── Step 2: PUT every file to its signed URL ───────────────────
      // Track total progress across all slots so the bar reflects the
      // entire bundle, not just the current PUT. Uploads run
      // sequentially: simpler progress maths, and most browsers cap to
      // 6 concurrent connections per host anyway.
      const totalBytes = slots.reduce((sum, s) => sum + s.file.size, 0);
      const perSlotLoaded = new Map<string, number>();

      for (const s of slots) {
        const signedSlot = signed.slots[s.slot];
        if (!signedSlot) {
          setError(`Server didn't issue a URL for ${s.slot}.`);
          setLoading(false);
          setProgress(0);
          return;
        }
        await putToSignedUrl(
          signedSlot.url,
          signedSlot.contentType,
          s.file,
          (loaded) => {
            perSlotLoaded.set(s.slot, loaded);
            let cumulative = 0;
            for (const v of perSlotLoaded.values()) cumulative += v;
            setProgress(
              totalBytes > 0
                ? Math.min(99, Math.round((cumulative / totalBytes) * 100))
                : 0
            );
          }
        );
        perSlotLoaded.set(s.slot, s.file.size);
      }
      setProgress(99); // last 1% reserved for the commit POST below

      // ─── Step 3: Commit metadata + R2 keys to the DB ────────────────
      const commitRes = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          subcategory,
          fileType,
          priceCents,
          tags: tags.trim(),
          fileName: file.name,
          keys: Object.fromEntries(
            Object.entries(signed.slots).map(([slot, info]) => [slot, info.key])
          ),
        }),
      });
      if (!commitRes.ok) {
        setError(await readJsonError(commitRes));
        setLoading(false);
        setProgress(0);
        return;
      }
      setProgress(100);

      // Keep the form locked while we navigate away — success.
      router.push("/dashboard/uploads");
      router.refresh();
    } catch (err) {
      // Network / abort / signed-URL PUT error — surface the message so
      // the creator can decide whether to retry or pick a smaller file.
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setLoading(false);
      setProgress(0);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormError message={error} />

      {/* ─── Step 1: Files ──────────────────────────────────────────────
          Files first. Dropping a .glb auto-flips Category + File-type to
          match, and the filename pre-fills the Title field below. */}
      <section className="space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <header className="flex items-center gap-3">
          <span
            className={`w-8 h-8 rounded-lg border text-sm font-bold flex items-center justify-center shrink-0 tabular-nums transition-colors ${
              file && preview
                ? "bg-info-muted border-info/30 text-info"
                : "bg-accent-muted border-accent/20 text-accent-light"
            }`}
          >
            {file && preview ? <Check className="w-4 h-4" /> : "1"}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-primary">
              Drop your files
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Drag & drop straight from your file manager — we&apos;ll
              detect the format and pre-fill the rest.
            </p>
          </div>
          {/* Tiny progress hint — '2 of 2 files added' */}
          <span className="text-[11px] text-muted tabular-nums shrink-0">
            {[file, preview].filter(Boolean).length} of 2 files
          </span>
        </header>

        {/* Asset file picker — drives auto-detection of category and
            file type, and prefills the title from the filename. */}
        <FilePicker
          label={
            fileType === "LOTTIE"
              ? "Lottie source (.json or .lottie)"
              : "Asset file"
          }
          sublabel={`Accepted: ${allowedLabel} · max 100 MB`}
          icon={FileBox}
          file={file}
          accept={fileAccept}
          inputRef={fileInputRef}
          onChange={onFileChange}
          onClear={clearFile}
        />

        {/* Preview image picker */}
        <FilePicker
          label="Preview image"
          sublabel="PNG, JPEG, or WebP · max 5 MB"
          icon={ImageIcon}
          file={preview}
          previewSrc={previewUrl ?? undefined}
          accept="image/png,image/jpeg,image/webp"
          inputRef={previewInputRef}
          onChange={onPreviewChange}
          onClear={clearPreview}
        />

        {/* 3D bundle companions — only visible when MODEL_3D */}
        {fileType === "MODEL_3D" && (
          <div className="space-y-4 rounded-xl border border-accent/20 bg-accent-muted/30 p-4">
            <div className="flex items-start gap-2.5">
              <Boxes className="w-4 h-4 text-accent-light mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-primary">
                  Optional alternate formats
                </h3>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">
                  Ship the same model in additional formats. Buyers pick
                  which one to download from the format menu on the asset
                  page — useful for game engines, legacy DCC tools, and
                  Apple AR.
                </p>
              </div>
            </div>

            <FilePicker
              label="FBX export (optional)"
              sublabel="Single .fbx — max 30 MB. Best for Unity / Unreal pipelines."
              icon={Box}
              file={modelFbx}
              accept=".fbx,application/octet-stream"
              inputRef={modelFbxRef}
              onChange={onModelFbxChange}
              onClear={clearModelFbx}
            />

            <FilePicker
              label="OBJ export (optional)"
              sublabel="Single .obj — max 20 MB. Universal text format, no animations."
              icon={Box}
              file={modelObj}
              accept=".obj,model/obj,text/plain"
              inputRef={modelObjRef}
              onChange={onModelObjChange}
              onClear={clearModelObj}
            />

            <FilePicker
              label="USDZ export (optional)"
              sublabel="Single .usdz — max 20 MB. Apple AR Quick Look / Vision Pro."
              icon={Box}
              file={modelUsdz}
              accept=".usdz,model/vnd.usdz+zip,application/zip"
              inputRef={modelUsdzRef}
              onChange={onModelUsdzChange}
              onClear={clearModelUsdz}
            />
          </div>
        )}

        {/* Lottie bundle companions — only visible when LOTTIE */}
        {fileType === "LOTTIE" && (
          <div className="space-y-4 rounded-xl border border-accent/20 bg-accent-muted/30 p-4">
            <div className="flex items-start gap-2.5">
              <Film className="w-4 h-4 text-accent-light mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-primary">
                  Optional bundle companions
                </h3>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">
                  Add a GIF and/or MP4 export of the same animation. Buyers
                  download all formats together as a ZIP, with a per-buyer
                  LICENSE.txt included automatically.
                </p>
              </div>
            </div>

            <FilePicker
              label="GIF preview (optional)"
              sublabel="Single .gif — max 15 MB. Used as a fallback for environments without Lottie support."
              icon={ImagePlay}
              file={lottieGif}
              accept=".gif,image/gif"
              inputRef={lottieGifRef}
              onChange={onLottieGifChange}
              onClear={clearLottieGif}
            />

            <FilePicker
              label="MP4 render (optional)"
              sublabel="Single .mp4 — max 25 MB. Useful for social/video tools that can't import Lottie."
              icon={Film}
              file={lottieMp4}
              accept=".mp4,video/mp4"
              inputRef={lottieMp4Ref}
              onChange={onLottieMp4Change}
              onClear={clearLottieMp4}
            />
          </div>
        )}

        {/* Per-type guidance — keeps the format hint inside the Files
            step so creators see it next to the picker, not 200px away
            in a separate block below the details. */}
        {FILE_TYPE_HINTS[fileType] && (
          <div className="rounded-lg border border-border bg-elevated/40 p-3 space-y-1.5">
            <p className="text-xs text-primary leading-relaxed">
              <span className="font-semibold">What to upload:</span>{" "}
              {FILE_TYPE_HINTS[fileType].what}
            </p>
            <p className="text-xs text-muted leading-relaxed">
              {FILE_TYPE_HINTS[fileType].note}
            </p>
          </div>
        )}
      </section>

      {/* ─── Step 2: Details ─────────────────────────────────────────── */}
      <section className="space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <header className="flex items-center gap-3">
          <span
            className={`w-8 h-8 rounded-lg border text-sm font-bold flex items-center justify-center shrink-0 tabular-nums transition-colors ${
              title.trim().length >= 3 && description.trim().length >= 10
                ? "bg-info-muted border-info/30 text-info"
                : "bg-accent-muted border-accent/20 text-accent-light"
            }`}
          >
            {title.trim().length >= 3 && description.trim().length >= 10 ? (
              <Check className="w-4 h-4" />
            ) : (
              "2"
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-primary">
              Asset details
            </h2>
            <p className="text-xs text-muted mt-0.5">
              The title is pre-filled from the filename — feel free to edit.
            </p>
          </div>
        </header>

        <div>
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
            maxLength={100}
            placeholder="e.g. Crystal Octahedron Pack"
          />
          <p className="mt-1.5 text-xs text-muted tabular-nums text-right">
            {title.length}/100
          </p>
        </div>

        <div className="w-full">
          <label htmlFor="description" className="block text-xs font-medium text-secondary mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            placeholder="What's in this pack? Polygon count, materials, intended use…"
            className="w-full px-4 py-3 bg-input border border-border rounded-lg text-sm text-primary placeholder:text-muted/70 focus:outline-none focus:bg-surface focus:border-border-focus transition-all resize-y"
          />
          <p className="mt-1.5 text-xs text-muted">{description.length}/2000</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-xs font-medium text-secondary mb-2">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full h-11 px-4 bg-input border border-border rounded-lg text-sm text-primary focus:outline-none focus:bg-surface focus:border-border-focus transition-all"
          >
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="fileType" className="block text-xs font-medium text-secondary mb-2">
            File type
          </label>
          <select
            id="fileType"
            value={fileType}
            onChange={(e) => onFileTypeChange(e.target.value)}
            className="w-full h-11 px-4 bg-input border border-border rounded-lg text-sm text-primary focus:outline-none focus:bg-surface focus:border-border-focus transition-all"
          >
            {FILE_TYPES.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub-category — only rendered when the chosen main category has
          a defined sub-category list. Optional; the empty leading option
          submits as null on the server. */}
      {subcategoryOptions.length > 0 && (
        <div>
          <label
            htmlFor="subcategory"
            className="block text-xs font-medium text-secondary mb-2"
          >
            Sub-category{" "}
            <span className="text-muted font-normal">(optional)</span>
          </label>
          <select
            id="subcategory"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            className="w-full h-11 px-4 bg-input border border-border rounded-lg text-sm text-primary focus:outline-none focus:bg-surface focus:border-border-focus transition-all"
          >
            <option value="">— Pick a sub-category —</option>
            {subcategoryOptions.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted">
            Helps buyers filter to assets like yours. Skip if nothing fits.
          </p>
        </div>
      )}

      {/* Price & Tags get dedicated picker components instead of plain
          number/text inputs — quick-pick presets remove the "how much
          should I charge?" stall, and tag chips make the field feel
          like a real curated taxonomy instead of a comma string. */}
      <PricePicker value={priceInr} onChange={setPriceInr} />
      <TagPicker
        value={tags}
        onChange={setTags}
        categorySlug={category}
      />
      </section>

      {/* ─── Submit footer ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        {loading && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-secondary">
                {progress < 100
                  ? "Uploading your asset…"
                  : "Processing — almost done…"}
              </span>
              <span className="font-medium text-primary">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-elevated overflow-hidden">
              <div
                className="h-full gradient-accent transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        <Button type="submit" disabled={loading} className="min-w-[180px]">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {progress < 100 ? `Uploading… ${progress}%` : "Processing…"}
            </>
          ) : (
            "Submit for review"
          )}
        </Button>
        <p className="text-xs text-muted mt-2">
          Your asset will be reviewed by an admin before going live. Large
          files may take a moment to upload — keep this tab open.
        </p>
      </div>
    </form>
  );
}

// ─── Price picker ────────────────────────────────────────────────────
// Four preset buttons (Free / ₹99 / ₹249 / ₹499) plus a Custom input.
// Most first-time creators stall on "how much should I charge?" — these
// presets cover the realistic range for hobbyist 3D / icon / animation
// drops and remove a small but real source of upload abandonment.
const PRICE_PRESETS = [
  { label: "Free", value: "0" },
  { label: "₹99", value: "99" },
  { label: "₹249", value: "249" },
  { label: "₹499", value: "499" },
] as const;

function PricePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  // A preset is "active" only when the typed value exactly matches it.
  // Anything else falls into Custom — so typing 350 keeps the input row
  // visible and de-highlights all presets.
  const activePreset = PRICE_PRESETS.find((p) => p.value === value);
  const isCustom = !activePreset;

  return (
    <div>
      <label
        htmlFor="price"
        className="block text-xs font-medium text-secondary mb-2"
      >
        Price (INR)
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {PRICE_PRESETS.map((p) => {
          const active = activePreset?.value === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              className={
                active
                  ? "px-3 h-9 rounded-lg text-sm font-semibold border bg-accent text-white border-accent shadow-[0_0_16px_-2px_rgba(124,58,237,0.6)] transition-all"
                  : "px-3 h-9 rounded-lg text-sm font-medium border bg-input text-secondary border-border hover:text-primary hover:border-border-hover transition-colors"
              }
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() =>
            // Switching to Custom from a preset clears the input so the
            // creator types a fresh value instead of editing the preset.
            onChange(activePreset ? "" : value)
          }
          className={
            isCustom
              ? "px-3 h-9 rounded-lg text-sm font-semibold border bg-accent text-white border-accent shadow-[0_0_16px_-2px_rgba(124,58,237,0.6)] transition-all"
              : "px-3 h-9 rounded-lg text-sm font-medium border bg-input text-secondary border-border hover:text-primary hover:border-border-hover transition-colors"
          }
        >
          Custom
        </button>
      </div>
      {isCustom && (
        <div className="relative">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted pointer-events-none">
            ₹
          </span>
          <input
            id="price"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. 350"
            className="w-full h-11 pl-7 pr-4 bg-input border border-border rounded-lg text-sm text-primary placeholder:text-muted/70 focus:outline-none focus:bg-surface focus:border-border-focus transition-all"
          />
        </div>
      )}
      <p className="mt-1.5 text-xs text-muted">
        Use 0 for free assets. Minimum paid price is ₹1.
      </p>
    </div>
  );
}

// ─── Tag picker ──────────────────────────────────────────────────────
// Chip UI with category-aware suggestions. Creators type a tag and press
// Enter / comma / Tab to commit it; click the × to remove. Suggestions
// live below the chips — clicking one adds it. Hard-capped at 10 tags
// because the server-side validation also enforces that.
const TAG_SUGGESTIONS: Record<string, string[]> = {
  "3d-models": [
    "low-poly",
    "stylized",
    "realistic",
    "character",
    "weapon",
    "vehicle",
    "prop",
    "rigged",
    "game-ready",
    "pbr",
  ],
  "3d-icons": [
    "ui",
    "icon-set",
    "isometric",
    "rounded",
    "minimal",
    "glossy",
    "outline",
    "color",
    "neon",
    "gradient",
  ],
  lottie: [
    "loader",
    "spinner",
    "success",
    "error",
    "onboarding",
    "celebration",
    "icon-animation",
    "logo",
    "transition",
    "ui",
  ],
  "svg-icons": [
    "outline",
    "filled",
    "duotone",
    "stroked",
    "thin",
    "bold",
    "ui",
    "minimal",
    "rounded",
    "social",
  ],
};

const MAX_TAGS = 10;

function TagPicker({
  value,
  onChange,
  categorySlug,
}: {
  value: string;
  onChange: (next: string) => void;
  categorySlug: string;
}) {
  const [draft, setDraft] = useState("");

  // Tags live on the wire as a CSV string so the existing submit code
  // doesn't change — convert on the fly.
  const tags = value
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 2 && t.length <= 30);
  const tagSet = new Set(tags);

  function commit(raw: string) {
    const next = raw.trim().toLowerCase();
    if (next.length < 2 || next.length > 30) return;
    if (tagSet.has(next)) return;
    if (tags.length >= MAX_TAGS) return;
    onChange([...tags, next].join(","));
    setDraft("");
  }

  function remove(tag: string) {
    onChange(tags.filter((t) => t !== tag).join(","));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (draft.trim()) {
        e.preventDefault();
        commit(draft);
      }
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      // Quick-undo: backspace on an empty input pops the last chip.
      remove(tags[tags.length - 1]);
    }
  }

  const suggestions = (TAG_SUGGESTIONS[categorySlug] ?? []).filter(
    (s) => !tagSet.has(s)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor="tags-input"
          className="text-xs font-medium text-secondary"
        >
          Tags
        </label>
        <span className="text-xs text-muted tabular-nums">
          {tags.length}/{MAX_TAGS}
        </span>
      </div>

      {/* Chip row + inline input */}
      <div className="min-h-11 px-2 py-1.5 bg-input border border-border rounded-lg flex flex-wrap items-center gap-1.5 focus-within:bg-surface focus-within:border-border-focus transition-all">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 pl-2.5 pr-1 h-7 rounded-full text-xs bg-accent-muted text-accent-light border border-accent/20"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={`Remove ${tag}`}
              className="w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-accent/20 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          id="tags-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && commit(draft)}
          maxLength={30}
          placeholder={
            tags.length === 0
              ? "Type a tag, press Enter"
              : tags.length >= MAX_TAGS
                ? "Max 10 tags"
                : "Add another"
          }
          disabled={tags.length >= MAX_TAGS}
          className="flex-1 min-w-32 bg-transparent text-sm text-primary placeholder:text-muted/70 focus:outline-none disabled:cursor-not-allowed py-1"
        />
      </div>

      {/* Suggestions for this category */}
      {suggestions.length > 0 && tags.length < MAX_TAGS && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted">Suggested:</span>
          {suggestions.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => commit(s)}
              className="px-2.5 h-6 rounded-full text-[11px] bg-elevated border border-border text-secondary hover:border-accent/40 hover:text-accent-light transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * File picker with drag-and-drop. The dashed drop zone becomes the entire
 * empty-state surface — creators can either click to open the OS picker
 * or drop the file straight from their file manager. Once a file is
 * attached the zone collapses to a compact row showing name + size + a
 * Remove button.
 *
 * Drag state is tracked on the wrapper so the border lights up the moment
 * a dragged file enters the zone, even if the cursor never reaches the
 * inner <label>. Counters guard against rapid enter/leave from child
 * elements firing dragleave when we're still inside the zone.
 */
function FilePicker({
  label,
  sublabel,
  icon: Icon,
  file,
  previewSrc,
  accept,
  inputRef,
  onChange,
  onClear,
}: {
  label: string;
  sublabel: string;
  icon: typeof Upload;
  file: File | null;
  previewSrc?: string;
  accept: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  const [dragging, setDragging] = useState(0);

  function onDragEnter(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes("Files")) {
      setDragging((n) => n + 1);
    }
  }
  function onDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  }
  function onDragLeave(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragging((n) => Math.max(0, n - 1));
  }
  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(0);
    const dropped = e.dataTransfer?.files?.[0];
    if (!dropped) return;
    // Synthesise a change event so the form's existing handler runs the
    // same validation path it does for the OS file picker.
    if (inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(dropped);
      inputRef.current.files = dt.files;
      const evt = new Event("change", { bubbles: true });
      inputRef.current.dispatchEvent(evt);
    }
  }

  return (
    <div className="w-full">
      <label className="block text-xs font-medium text-secondary mb-2">
        {label}
      </label>

      {file ? (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-elevated">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt="Preview"
              className="w-14 h-14 rounded-md object-cover bg-canvas"
            />
          ) : (
            <div className="w-14 h-14 rounded-md bg-canvas flex items-center justify-center text-muted">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-primary truncate">{file.name}</div>
            <div className="text-xs text-muted">{formatFileSize(file.size)}</div>
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove file"
            className="p-2 rounded-md text-muted hover:text-danger hover:bg-danger-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={`${label}-input`}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
            dragging > 0
              ? "border-accent bg-accent-muted/60"
              : "border-border bg-surface/50 hover:border-accent/40 hover:bg-elevated"
          }`}
        >
          <Icon
            className={`w-6 h-6 transition-colors ${
              dragging > 0 ? "text-accent-light" : "text-muted"
            }`}
          />
          <div className="text-sm font-medium text-secondary">
            {dragging > 0 ? "Drop to upload" : "Drag & drop, or click to choose"}
          </div>
          <div className="text-xs text-muted">{sublabel}</div>
        </label>
      )}

      <input
        id={`${label}-input`}
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
