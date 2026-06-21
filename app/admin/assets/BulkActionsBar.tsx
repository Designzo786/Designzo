"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Wrench, Loader2 } from "lucide-react";
import { useDialog } from "@/components/ui/ConfirmDialog";
import type { AssetStatus } from "@prisma/client";

interface Props {
  /** IDs the admin has selected from the per-row checkboxes. */
  selected: string[];
  /** Clear the selection after a successful action so the admin can
   *  trip-count their progress. */
  onClear: () => void;
}

/**
 * Sticky bottom-of-screen action bar. Only renders when at least one
 * row is selected. Three buttons mirror the per-row toolkit (Approve /
 * Needs improvement / Reject) but apply to every selected ID in a
 * single round-trip via /api/admin/assets/bulk.
 */
export function BulkActionsBar({ selected, onClear }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<AssetStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { confirm, prompt, dialog } = useDialog();

  if (selected.length === 0) return null;

  async function run(status: AssetStatus, note?: string) {
    setError(null);
    setBusy(status);
    const res = await fetch("/api/admin/assets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected, status, note }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Bulk action failed.");
      setBusy(null);
      return;
    }
    setBusy(null);
    onClear();
    startTransition(() => router.refresh());
  }

  async function onApprove() {
    const ok = await confirm({
      variant: "info",
      title: `Approve ${selected.length} asset${selected.length === 1 ? "" : "s"}?`,
      body: "Every selected asset becomes publicly visible. The uploaders get notified.",
      confirmLabel: "Approve all",
    });
    if (ok) await run("APPROVED");
  }

  async function onReject() {
    const note = await prompt({
      variant: "danger",
      title: `Reject ${selected.length} asset${selected.length === 1 ? "" : "s"}`,
      body: "The same note is sent to every creator. Use this for batch issues like 'previews are too dark'.",
      placeholder: "Shared rejection note (optional)",
      multiline: true,
      required: false,
      confirmLabel: "Reject all",
    });
    if (note === null) return;
    await run("REJECTED", note || undefined);
  }

  async function onNeedsImprovement() {
    const note = await prompt({
      variant: "warning",
      title: `Request changes on ${selected.length} asset${selected.length === 1 ? "" : "s"}`,
      body: "Shared note. Each creator gets a notification + the asset moves to NEEDS_IMPROVEMENT.",
      placeholder: "What needs to change?",
      multiline: true,
      required: false,
      confirmLabel: "Request changes",
    });
    if (note === null) return;
    await run("NEEDS_IMPROVEMENT", note || undefined);
  }

  const working = busy !== null || pending;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-2xl w-[calc(100%-2rem)] popover rounded-2xl shadow-2xl border border-border bg-surface/95 backdrop-blur p-3 sm:p-4 flex items-center gap-2 sm:gap-3 flex-wrap animate-fade-in">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-primary">
            {selected.length} selected
          </div>
          {error && (
            <div className="text-xs text-danger truncate mt-0.5">{error}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={working}
          className="text-xs px-2.5 py-1.5 rounded-md text-muted hover:text-primary border border-border hover:border-border-hover transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={working}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-accent-light bg-accent-muted hover:bg-accent/20 border border-accent/20 transition-colors disabled:opacity-50"
        >
          {busy === "APPROVED" ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Check className="w-3 h-3" />
          )}
          Approve
        </button>
        <button
          type="button"
          onClick={onNeedsImprovement}
          disabled={working}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-gold bg-gold-muted hover:bg-gold/20 border border-gold/20 transition-colors disabled:opacity-50"
        >
          {busy === "NEEDS_IMPROVEMENT" ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Wrench className="w-3 h-3" />
          )}
          Needs improvement
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={working}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-danger bg-danger-muted hover:bg-danger/20 border border-danger/20 transition-colors disabled:opacity-50"
        >
          {busy === "REJECTED" ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <X className="w-3 h-3" />
          )}
          Reject
        </button>
      </div>
      {dialog}
    </>
  );
}
