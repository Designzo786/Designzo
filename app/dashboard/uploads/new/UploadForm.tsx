"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Image as ImageIcon, FileBox, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { CATEGORIES, FILE_TYPES } from "@/lib/mock/assets";
import { EXTENSIONS_BY_TYPE, getExtension } from "@/lib/upload-validation";
import { formatFileSize } from "@/lib/utils";
import type { FileType } from "@prisma/client";

const MAX_PREVIEW_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 100 * 1024 * 1024;

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
    what: "Upload a Bodymovin .json or a packed .lottie animation from LottieFiles or After Effects.",
    note: "Buyers see your animation play live on the asset page, then download the original after purchase.",
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

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);

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
        label="Asset file"
        sublabel={`Accepted: ${allowedLabel} · max 100 MB`}
        icon={FileBox}
        file={file}
        accept={fileAccept}
        inputRef={fileInputRef}
        onChange={onFileChange}
        onClear={clearFile}
      />

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
