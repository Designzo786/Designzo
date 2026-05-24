"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

/**
 * Trash-can button rendered in the My Assets row. Confirms before firing the
 * DELETE so a stray click doesn't nuke an upload, and surfaces the server's
 * 409 message inline (e.g. "asset has been purchased") rather than a generic
 * failure toast.
 */
export function DeleteAssetButton({
  assetId,
  title,
}: {
  assetId: string;
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setError(null);
    if (
      !confirm(
        `Permanently delete "${title}"?\n\nThis removes the asset and its files. This can't be undone.`
      )
    ) {
      return;
    }

    const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not delete this asset.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        title="Delete asset"
        aria-label={`Delete ${title}`}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-danger bg-danger-muted hover:bg-danger/20 border border-danger/20 transition-colors disabled:opacity-50"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>
      {error && (
        <span className="text-[11px] text-danger max-w-55 text-right leading-snug">
          {error}
        </span>
      )}
    </div>
  );
}
