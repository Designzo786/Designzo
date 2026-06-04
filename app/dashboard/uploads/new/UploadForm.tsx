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
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { CATEGORIES, FILE_TYPES } from "@/lib/mock/assets";
import { EXTENSIONS_BY_TYPE, getExtension } from "@/lib/upload-validation";
import { formatFileSize } from "@/lib/utils";
import type { FileType } from "@prisma/client";

const MAX_PREVIEW_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
// Companion limits — kept in sync with the server-side ceilings in
// /api/assets so the client surfaces the right error before upload.
const MAX_LOTTIE_GIF_BYTES = 15 * 1024 * 1024;
const MAX_LOTTIE_MP4_BYTES = 25 * 1024 * 1024;

interface UploadResult {
  ok: boolean;
  data: { error?: string; id?: string };
}

// fetch() can't report upload progress — XMLHttpRequest can. This wraps an
// XHR POST so the form can show a real progress bar for large asset files.
function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (pct: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      let data: UploadResult["data"] = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // non-JSON response — leave data empty
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, data });
    });
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.send(formData);
  });
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
  materials: "MATERIAL",
};

// Per-file-type guidance shown right under the file-picker so creators know
// exactly what to upload and what each format does.
const FILE_TYPE_HINTS: Record<string, { what: string; note: string }> = {
  MODEL_3D: {
    what: "Upload a .glb or .gltf file from Blender, Maya, 3ds Max, or any glTF exporter.",
    note: "Buyers see a live 3D preview rendered with Three.js, then download your file after purchase.",
  },
  LOTTIE: {
    what: "Upload a Bodymovin .json or a packed .lottie animation from LottieFiles or After Effects. You can optionally add GIF + MP4 renders of the same animation — buyers download all formats as a single ZIP bundle.",
    note: "The bundle automatically ships with a per-buyer LICENSE.txt that records the purchase, license type, and scope of use.",
  },
  SVG_ICON: {
    what: "Upload a single .svg icon. Scripts and event handlers are blocked at validation for security.",
    note: "Re-export from Figma/Sketch/Illustrator as plain SVG with no JS or external references.",
  },
  MATERIAL: {
    what: "Upload a .zip / .sbsar / .mtl / .mat / .glsl material or shader bundle.",
    note: "Include readme + sample render inside the zip if your material has dependencies.",
  },
};

export function UploadForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0].slug);
  const [fileType, setFileType] = useState<string>(
    CATEGORY_TO_FILE_TYPE[CATEGORIES[0].slug] ?? FILE_TYPES[0].slug
  );
  const [priceInr, setPriceInr] = useState("0");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Optional Lottie companion uploads — surfaced only when fileType === LOTTIE.
  const [lottieGif, setLottieGif] = useState<File | null>(null);
  const [lottieMp4, setLottieMp4] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const lottieGifRef = useRef<HTMLInputElement>(null);
  const lottieMp4Ref = useRef<HTMLInputElement>(null);

  // Extensions valid for the currently-selected file type. Drives both the
  // file picker's `accept` filter and the instant validation below.
  const allowedExtensions = EXTENSIONS_BY_TYPE[fileType as FileType] ?? [];
  const fileAccept = allowedExtensions.map((e) => `.${e}`).join(",");
  const allowedLabel = allowedExtensions.map((e) => `.${e}`).join(", ");

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = getExtension(f.name);
    if (!allowedExtensions.includes(ext)) {
      setError(
        `A ".${ext}" file isn't valid for this asset type. Accepted: ${allowedLabel}.`
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

  // Picking a category auto-flips the file-type selector to whatever
  // natural type it expects (lottie -> LOTTIE, svg-icons -> SVG_ICON, etc.)
  // The user can still override the file-type manually afterwards if they
  // have a non-standard pairing in mind.
  function onCategoryChange(next: string) {
    setCategory(next);
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
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("category", category);
      fd.append("fileType", fileType);
      fd.append("priceCents", String(priceCents));
      fd.append("tags", tags.trim());
      fd.append("file", file);
      fd.append("preview", preview);
      // Optional Lottie bundle companions — only sent for LOTTIE uploads.
      // Server-side validation rejects them with a clear error if a creator
      // somehow attaches them to a non-Lottie asset.
      if (fileType === "LOTTIE") {
        if (lottieGif) fd.append("lottieGif", lottieGif);
        if (lottieMp4) fd.append("lottieMp4", lottieMp4);
      }

      const res = await uploadWithProgress("/api/assets", fd, setProgress);

      if (!res.ok) {
        setError(res.data.error ?? "Upload failed. Please try again.");
        setLoading(false);
        setProgress(0);
        return;
      }

      // Keep the form locked while we navigate away — success.
      router.push("/dashboard/uploads");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      setProgress(0);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FormError message={error} />

      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        minLength={3}
        maxLength={100}
        placeholder="e.g. Crystal Octahedron Pack"
      />

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

      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label="Price (INR)"
          type="number"
          inputMode="decimal"
          min="0"
          step="1"
          value={priceInr}
          onChange={(e) => setPriceInr(e.target.value)}
          placeholder="0"
          hint="₹ — use 0 for free assets, minimum ₹1 otherwise"
        />

        <Input
          label="Tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="lowpoly, neon, abstract"
          hint="Comma-separated, up to 10"
        />
      </div>

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

      {/* Asset file picker */}
      <FilePicker
        label={
          fileType === "LOTTIE" ? "Lottie source (.json or .lottie)" : "Asset file"
        }
        sublabel={`Accepted: ${allowedLabel} · max 100 MB`}
        icon={FileBox}
        file={file}
        accept={fileAccept}
        inputRef={fileInputRef}
        onChange={onFileChange}
        onClear={clearFile}
      />

      {/* Lottie bundle companions — only visible when the asset type is
          LOTTIE. Both fields are OPTIONAL — a Lottie pack can ship JSON-only
          or with one/both companion formats. When the buyer downloads, the
          server ZIPs whatever the creator provided plus the LICENSE.txt. */}
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

      {/* Per-type guidance — sits under the file picker so creators know
          exactly what format they should be uploading and what buyers will
          see on the asset page. Each entry is keyed by fileType in
          FILE_TYPE_HINTS at the top of the file. */}
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

      <div className="pt-2">
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
          className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-border bg-surface/50 hover:border-accent/40 hover:bg-elevated cursor-pointer transition-colors"
        >
          <Icon className="w-6 h-6 text-muted" />
          <div className="text-sm font-medium text-secondary">
            Click to choose a file
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
