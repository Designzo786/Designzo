"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export function KycActions({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const { confirm, dialog } = useConfirm();

  async function update(action: "VERIFY" | "REJECT", note?: string) {
    setError(null);
    const res = await fetch(`/api/admin/kyc/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Action failed.");
      return;
    }
    startTransition(() => router.push("/admin/kyc"));
  }

  async function onApprove() {
    const ok = await confirm({
      variant: "info",
      title: "Approve this KYC submission?",
      body: "The creator becomes payout-eligible immediately. Their bank details will be used for all future payouts.",
      confirmLabel: "Approve KYC",
    });
    if (ok) await update("VERIFY");
  }

  function onSubmitReject(e: React.FormEvent) {
    e.preventDefault();
    if (rejectionNote.trim().length < 10) {
      setError("Provide a clear rejection reason (10+ characters) so the user can fix it.");
      return;
    }
    update("REJECT", rejectionNote.trim());
  }

  return (
    <>
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
          Decision
        </div>
        <p className="text-xs text-secondary">
          Approving makes the creator payout-eligible. Rejecting sends the
          submission back with a note explaining what to fix.
        </p>
      </div>

      <FormError message={error} />

      {showReject ? (
        <form onSubmit={onSubmitReject} className="space-y-3">
          <label className="block text-xs font-medium text-secondary">
            Rejection reason (visible to user)
          </label>
          <textarea
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. Aadhaar back image is blurry — please re-upload a clearer photo."
            className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-primary placeholder:text-muted/70 focus:outline-none focus:border-border-focus resize-none"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="danger" disabled={pending} className="min-w-[140px]">
              {pending ? "Rejecting…" : "Confirm rejection"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setShowReject(false);
                setRejectionNote("");
                setError(null);
              }}
              className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-info hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            Approve verification
          </button>
          <button
            type="button"
            onClick={() => setShowReject(true)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-danger bg-danger-muted border border-danger/20 hover:bg-danger/10 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            Reject
          </button>
        </div>
      )}
    </div>
    {dialog}
    </>
  );
}
