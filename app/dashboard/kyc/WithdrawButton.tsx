"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export function WithdrawButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  async function onClick() {
    const ok = await confirm({
      variant: "warning",
      title: "Withdraw your KYC submission?",
      body: "Your pending review is cancelled and the form unlocks for editing. You can resubmit any time.",
      confirmLabel: "Withdraw",
    });
    if (!ok) return;
    setError(null);
    setBusy(true);
    const res = await fetch("/api/kyc/withdraw", { method: "POST" });
    if (!res.ok) {
      setError("Could not withdraw. Please try again.");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted hover:text-secondary border border-border hover:border-border-hover transition-colors disabled:opacity-50"
      >
        <RotateCcw className="w-3 h-3" />
        {busy ? "Withdrawing…" : "Withdraw submission"}
      </button>
      {error && <span className="text-[11px] text-danger">{error}</span>}
      {dialog}
    </div>
  );
}
