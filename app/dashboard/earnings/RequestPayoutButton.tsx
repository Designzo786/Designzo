"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatMoney } from "@/lib/utils";

export function RequestPayoutButton({
  disabled,
  amount,
}: {
  disabled: boolean;
  amount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  async function onClick() {
    const ok = await confirm({
      variant: "info",
      title: `Withdraw ${formatMoney(amount)}?`,
      body: "Your balance is deducted immediately and the funds are queued for transfer to your registered bank account. Settlement usually takes 1–3 business days.",
      confirmLabel: "Request payout",
    });
    if (!ok) return;
    setError(null);
    setBusy(true);

    const res = await fetch("/api/payouts/request", { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Could not request payout.");
      setBusy(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="text-right">
      {error && (
        <div className="text-xs text-danger mb-2 max-w-65">{error}</div>
      )}
      <Button onClick={onClick} disabled={disabled || busy} className="h-11">
        <Banknote className="w-4 h-4" />
        {busy ? "Requesting…" : `Withdraw ${formatMoney(amount)}`}
        <ArrowRight className="w-4 h-4" />
      </Button>
      {dialog}
    </div>
  );
}
