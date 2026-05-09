"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

export function WithdrawButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (
      !confirm(
        "Withdraw your pending KYC submission? You can resubmit anytime."
      )
    )
      return;
    setBusy(true);
    const res = await fetch("/api/kyc/withdraw", { method: "POST" });
    if (!res.ok) {
      alert("Could not withdraw. Please try again.");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted hover:text-secondary border border-border hover:border-border-hover transition-colors disabled:opacity-50"
    >
      <RotateCcw className="w-3 h-3" />
      {busy ? "Withdrawing…" : "Withdraw submission"}
    </button>
  );
}
