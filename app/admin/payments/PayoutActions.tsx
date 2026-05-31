"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/ui/ConfirmDialog";
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
  const { confirm, prompt, dialog } = useDialog();

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

  async function onMarkPaid() {
    const ref = await prompt({
      variant: "info",
      title: "Mark payout as paid",
      body: "Enter the bank transaction reference (UTR / IMPS ref). This is shown to the creator and emailed to them so they can reconcile.",
      placeholder: "e.g. SBIN0123456789",
      required: false,
      confirmLabel: "Mark paid",
    });
    if (ref === null) return; // cancelled

    if (!ref) {
      const ok = await confirm({
        variant: "warning",
        title: "No reference entered",
        body: "Mark this payout as PAID without a UTR? The creator won't have a reference to reconcile against their bank statement.",
        confirmLabel: "Mark paid anyway",
      });
      if (!ok) return;
    }
    await update("PAID", { transactionRef: ref || undefined });
  }

  async function onMarkFailed() {
    const reason = await prompt({
      variant: "danger",
      title: "Mark payout as failed",
      body: "Tell the creator what went wrong. They'll see this on their earnings page and in the failure notification. The amount returns to their balance so they can retry.",
      placeholder: "e.g. Bank rejected — IFSC invalid",
      multiline: true,
      required: false,
      confirmLabel: "Mark failed",
    });
    if (reason === null) return;
    await update("FAILED", { reason: reason || undefined });
  }

  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        {error && <span className="text-xs text-danger mr-2">{error}</span>}

        {status === "PENDING" && (
          <button
            type="button"
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
              type="button"
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
              type="button"
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
      {dialog}
    </>
  );
}
