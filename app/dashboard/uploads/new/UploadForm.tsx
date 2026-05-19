"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Image as ImageIcon, FileBox } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { CATEGORIES, FILE_TYPES } from "@/lib/mock/assets";
import { EXTENSIONS_BY_TYPE, getExtension } from "@/lib/upload-validation";
import { formatFileSize } from "@/lib/utils";
import type { FileType } from "@prisma/client";

const MAX_PREVIEW_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 100 * 1024 * 1024;

export function UploadForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0].slug);
  const [fileType, setFileType] = useState<string>(FILE_TYPES[0].slug);
  const [priceUsd, setPriceUsd] = useState("0");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    const priceUsdNum = Number(priceUsd);
    if (!Number.isFinite(priceUsdNum) || priceUsdNum < 0) {
      return setError("Price must be 0 or higher.");
    }
    const priceCents = Math.round(priceUsdNum * 100);

    setLoading(true);
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

      const res = await fetch("/api/assets", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Upload failed. Please try again.");
        setLoading(false);
        return;
      }

      router.push("/dashboard/uploads");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
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
            onChange={(e) => setCategory(e.target.value)}
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
          label="Price (USD)"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={priceUsd}
          onChange={(e) => setPriceUsd(e.target.value)}
          placeholder="0.00"
          hint="Use 0 for free assets"
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

      <div className="pt-2">
        <Button type="submit" disabled={loading} className="min-w-[160px]">
          {loading ? "Uploading…" : "Submit for review"}
        </Button>
        <p className="text-xs text-muted mt-2">
          Your asset will be reviewed by an admin before going live.
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
