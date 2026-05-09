"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PayoutStatus } from "@prisma/client";

export function PayoutActions({
  payoutId,
  status,
}: {
  payoutId: string;
  status: PayoutStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function update(next: PayoutStatus, reason?: string) {
    setError(null);
    const res = await fetch(`/api/admin/payouts/${payoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, failureReason: reason }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Action failed.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      {error && <span className="text-xs text-danger mr-2">{error}</span>}

      {status === "PENDING" && (
        <button
          onClick={() => update("PROCESSING")}
          disabled={pending}
          className="px-2.5 py-1.5 rounded-md text-xs font-medium text-info bg-info-muted hover:bg-info/20 border border-info/20 transition-colors disabled:opacity-50"
        >
          Mark processing
        </button>
      )}

      {(status === "PENDING" || status === "PROCESSING") && (
        <>
          <button
            onClick={() => {
              if (!confirm("Mark this payout as PAID? This is irreversible.")) return;
              update("PAID");
            }}
            disabled={pending}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium text-accent-light bg-accent-muted hover:bg-accent/20 border border-accent/20 transition-colors disabled:opacity-50"
          >
            Mark paid
          </button>
          <button
            onClick={() => {
              const reason = prompt("Reason for failure:");
              if (reason === null) return;
              update("FAILED", reason.trim() || undefined);
            }}
            disabled={pending}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium text-danger bg-danger-muted hover:bg-danger/20 border border-danger/20 transition-colors disabled:opacity-50"
          >
            Mark failed
          </button>
        </>
      )}

      {(status === "PAID" || status === "FAILED") && (
        <span className="text-xs text-muted">No actions available</span>
      )}
    </div>
  );
}
