"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

/**
 * Icon-only delete button rendered in the My Assets toolkit. Matches the
 * sibling Open / Re-download / Edit buttons in size and shape so the
 * actions column reads as a single grouped control. The destructive
 * intent stays clear through the red-on-hover tint and the confirm modal
 * — the icon itself stays neutral when idle so the row doesn't shout
 * "delete" at the creator every time they scan their library.
 *
 * Surfaces the server's 409 message inline (e.g. "asset has been
 * purchased") so the creator sees why the delete was refused without a
 * separate toast layer.
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
  const [deleting, setDeleting] = useState(false);
  const { confirm, dialog } = useConfirm();

  async function onDelete() {
    setError(null);
    const ok = await confirm({
      variant: "danger",
      title: `Delete "${title}"?`,
      body: "This permanently removes the asset, its preview, and the source file. Cannot be undone.",
      confirmLabel: "Delete forever",
    });
    if (!ok) return;

    setDeleting(true);
    const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not delete this asset.");
      setDeleting(false);
      return;
    }
    startTransition(() => router.refresh());
  }

  const busy = deleting || pending;

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        title="Delete asset"
        aria-label={`Delete ${title}`}
        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted hover:text-danger hover:bg-danger-muted border border-border hover:border-danger/40 transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Trash2 className="w-3.5 h-3.5" />
        )}
      </button>
      {error && (
        <span className="text-[11px] text-danger max-w-55 text-right leading-snug">
          {error}
        </span>
      )}
      {dialog}
    </span>
  );
}
