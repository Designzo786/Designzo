"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { FormError } from "@/components/ui/FormError";
import { formatFileSize } from "@/lib/utils";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

export function AvatarUpload({
  initialImage,
  name,
  email,
}: {
  initialImage: string | null;
  name: string | null;
  email: string;
}) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(initialImage);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.type.startsWith("image/")) {
      setError("Avatar must be an image.");
      return;
    }
    if (f.size > MAX_AVATAR_BYTES) {
      setError(`Avatar is too large (max ${formatFileSize(MAX_AVATAR_BYTES)}).`);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", f);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        setLoading(false);
        return;
      }

      setImageUrl(data.url);
      setLoading(false);
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove() {
    if (!confirm("Remove your avatar?")) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not remove avatar.");
        setLoading(false);
        return;
      }
      setImageUrl(null);
      setLoading(false);
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar src={imageUrl} name={name ?? email} size={64} />
          {loading && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-secondary bg-elevated border border-border hover:border-border-hover hover:text-primary transition-colors disabled:opacity-50"
          >
            <Camera className="w-3.5 h-3.5" />
            {imageUrl ? "Change avatar" : "Upload avatar"}
          </button>
          {imageUrl && (
            <button
              type="button"
              onClick={onRemove}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-danger hover:bg-danger-muted transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onPick}
          />
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      )}
    </div>
  );
}
