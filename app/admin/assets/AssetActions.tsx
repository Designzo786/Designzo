"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, RotateCcw, Trash2 } from "lucide-react";
import { useDialog } from "@/components/ui/ConfirmDialog";
import type { AssetStatus } from "@prisma/client";

export function AssetActions({
  assetId,
  status,
}: {
  assetId: string;
  status: AssetStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { confirm, prompt, dialog } = useDialog();

  async function update(next: AssetStatus, note?: string) {
    setError(null);
    const res = await fetch(`/api/admin/assets/${assetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, note }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Action failed.");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function onApprove() {
    const ok = await confirm({
      variant: "info",
      title: "Approve this asset?",
      body: "Once approved, the asset becomes publicly visible in the marketplace.",
      confirmLabel: "Approve",
    });
    if (ok) await update("APPROVED");
  }

  async function onReject() {
    const note = await prompt({
      variant: "danger",
      title: "Reject this asset",
      body: "Tell the creator what needs to change. The note is visible on their dashboard.",
      placeholder: "e.g. preview image is too dark to evaluate",
      multiline: true,
      required: false,
      confirmLabel: "Reject",
    });
    if (note === null) return;
    await update("REJECTED", note || undefined);
  }

  async function onReset() {
    const ok = await confirm({
      variant: "warning",
      title: "Move back to pending?",
      body: "The asset returns to the moderation queue and is no longer publicly visible.",
      confirmLabel: "Re-queue",
    });
    if (ok) await update("PENDING");
  }

  async function onDelete() {
    const ok = await confirm({
      variant: "danger",
      title: "Permanently delete this asset?",
      body: "This removes the files and the DB row. Cannot be undone. If the asset already has buyers, use Reject instead so existing libraries keep working.",
      confirmLabel: "Delete forever",
    });
    if (!ok) return;
    setError(null);
    const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not delete.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        {error && <span className="text-xs text-danger mr-2">{error}</span>}

        {status === "PENDING" && (
          <>
            <button
              type="button"
              onClick={onApprove}
              disabled={pending}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-accent-light bg-accent-muted hover:bg-accent/20 border border-accent/20 transition-colors disabled:opacity-50"
            >
              <Check className="w-3 h-3" /> Approve
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={pending}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-danger bg-danger-muted hover:bg-danger/20 border border-danger/20 transition-colors disabled:opacity-50"
            >
              <X className="w-3 h-3" /> Reject
            </button>
          </>
        )}

        {status !== "PENDING" && (
          <button
            type="button"
            onClick={onReset}
            disabled={pending}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted hover:text-primary border border-border hover:border-border-hover transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" /> Re-queue
          </button>
        )}

        {/* Admin nuke — always available. The endpoint refuses if the asset
            has completed purchases, so this can't accidentally orphan a
            buyer's library entry. */}
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          title="Permanently delete asset"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-danger border border-danger/30 hover:bg-danger/10 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>
      {dialog}
    </>
  );
}
