"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  X,
  RotateCcw,
  Trash2,
  ExternalLink,
  Wrench,
} from "lucide-react";
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

  async function onNeedsImprovement() {
    const note = await prompt({
      variant: "warning",
      title: "Request improvements",
      body: "Tell the creator what to revise. The note shows up on their My-Assets row and again on the edit form. Saving an edit moves the asset back to PENDING for re-review.",
      placeholder: "e.g. tighten the topology around the head and re-export",
      multiline: true,
      required: false,
      confirmLabel: "Request changes",
    });
    if (note === null) return;
    await update("NEEDS_IMPROVEMENT", note || undefined);
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
      {/* `flex-wrap justify-end` lets the row break into a second line
          when the viewport is narrow instead of pushing the buttons
          outside the cell. `whitespace-nowrap` on every button keeps
          the label + icon as a single unit no matter how narrow the
          column gets. */}
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {error && (
          <span className="text-xs text-danger mr-2 w-full text-right">
            {error}
          </span>
        )}

        {/* View — opens the public asset page in a new tab so the admin
            can review the full 3D / Lottie / SVG preview before
            deciding. Available on every row regardless of status; the
            uploader and admins are always allowed to view PENDING /
            REJECTED / NEEDS_IMPROVEMENT assets. */}
        <a
          href={`/explore/${assetId}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open asset to review in a new tab"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap text-secondary hover:text-primary border border-border hover:border-border-hover transition-colors"
        >
          <ExternalLink className="w-3 h-3" /> View
        </a>

        {status === "PENDING" && (
          <>
            <button
              type="button"
              onClick={onApprove}
              disabled={pending}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap text-accent-light bg-accent-muted hover:bg-accent/20 border border-accent/20 transition-colors disabled:opacity-50"
            >
              <Check className="w-3 h-3" /> Approve
            </button>
            <button
              type="button"
              onClick={onNeedsImprovement}
              disabled={pending}
              title="Send back to the creator with revision notes"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap text-gold bg-gold-muted hover:bg-gold/20 border border-gold/20 transition-colors disabled:opacity-50"
            >
              <Wrench className="w-3 h-3" /> Needs improvement
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={pending}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap text-danger bg-danger-muted hover:bg-danger/20 border border-danger/20 transition-colors disabled:opacity-50"
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
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap text-muted hover:text-primary border border-border hover:border-border-hover transition-colors disabled:opacity-50"
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
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap text-danger border border-danger/30 hover:bg-danger/10 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>
      {dialog}
    </>
  );
}
