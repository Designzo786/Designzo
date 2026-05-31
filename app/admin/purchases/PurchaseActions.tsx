"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import type { PurchaseStatus } from "@prisma/client";

export function PurchaseActions({
  purchaseId,
  status,
}: {
  purchaseId: string;
  status: PurchaseStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  async function update(next: PurchaseStatus) {
    if (next !== "COMPLETED") {
      const ok = await confirm({
        variant: "danger",
        title: "Mark this purchase as not paid?",
        body: "The buyer loses access to the asset and the creator's credit is reversed. Use this only for confirmed refunds or fraud.",
        confirmLabel: "Revoke purchase",
      });
      if (!ok) return;
    }
    setError(null);
    const res = await fetch(`/api/admin/purchases/${purchaseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Action failed.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        {error && <span className="text-xs text-danger mr-2">{error}</span>}

        {status !== "COMPLETED" && (
          <button
            type="button"
            onClick={() => update("COMPLETED")}
            disabled={pending}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-accent-light bg-accent-muted hover:bg-accent/20 border border-accent/20 transition-colors disabled:opacity-50"
          >
            <Check className="w-3 h-3" />
            Mark paid
          </button>
        )}

        {status === "COMPLETED" && (
          <button
            type="button"
            onClick={() => update("REFUNDED")}
            disabled={pending}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-danger bg-danger-muted hover:bg-danger/20 border border-danger/20 transition-colors disabled:opacity-50"
          >
            <X className="w-3 h-3" />
            Mark not paid
          </button>
        )}
      </div>
      {dialog}
    </>
  );
}
