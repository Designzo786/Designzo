"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, RotateCcw } from "lucide-react";
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

  function onApprove() {
    if (!confirm("Approve this asset and make it publicly visible?")) return;
    update("APPROVED");
  }

  function onReject() {
    const note = prompt("Reason for rejection (visible to creator):");
    if (note === null) return;
    update("REJECTED", note.trim() || undefined);
  }

  function onReset() {
    if (!confirm("Move this asset back to the pending queue?")) return;
    update("PENDING");
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      {error && <span className="text-xs text-danger mr-2">{error}</span>}

      {status === "PENDING" && (
        <>
          <button
            onClick={onApprove}
            disabled={pending}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-accent-light bg-accent-muted hover:bg-accent/20 border border-accent/20 transition-colors disabled:opacity-50"
          >
            <Check className="w-3 h-3" /> Approve
          </button>
          <button
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
          onClick={onReset}
          disabled={pending}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted hover:text-primary border border-border hover:border-border-hover transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-3 h-3" /> Re-queue
        </button>
      )}
    </div>
  );
}
