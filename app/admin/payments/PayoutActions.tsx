"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PayoutStatus } from "@prisma/client";

export function PayoutActions({
  payoutId,
  status,
  // False = creator has no usable bank details (KYC incomplete). Pay buttons
  // are disabled in that case so the admin can't mark a payout paid when the
  // money has nowhere to actually go.
  canPay = true,
}: {
  payoutId: string;
  status: PayoutStatus;
  canPay?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function update(
    next: PayoutStatus,
    opts: { reason?: string; transactionRef?: string } = {}
  ) {
    setError(null);
    const res = await fetch(`/api/admin/payouts/${payoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: next,
        failureReason: opts.reason,
        transactionRef: opts.transactionRef,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Action failed.");
      return;
    }
    startTransition(() => router.refresh());
  }

  function onMarkPaid() {
    const ref = prompt(
      "Enter the bank transaction reference (UTR / IMPS ref).\nThis is shown to the creator and sent to them by email.",
      ""
    );
    if (ref === null) return; // cancelled
    if (!ref.trim()) {
      if (
        !confirm(
          "No reference entered. Mark as PAID without one? The creator won't have a UTR to reconcile against."
        )
      )
        return;
    }
    update("PAID", { transactionRef: ref.trim() || undefined });
  }

  function onMarkFailed() {
    const reason = prompt("Reason for failure:");
    if (reason === null) return;
    update("FAILED", { reason: reason.trim() || undefined });
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
            onClick={onMarkPaid}
            disabled={pending || !canPay}
            title={
              !canPay
                ? "Creator's KYC is incomplete — bank details missing"
                : undefined
            }
            className="px-2.5 py-1.5 rounded-md text-xs font-medium text-accent-light bg-accent-muted hover:bg-accent/20 border border-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mark paid…
          </button>
          <button
            onClick={onMarkFailed}
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
