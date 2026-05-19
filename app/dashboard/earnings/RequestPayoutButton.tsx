"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";

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

  async function onClick() {
    if (
      !confirm(
        `Request a payout of ${formatPrice(amount)}? Your balance will be deducted now and the funds will be sent to your registered bank account.`
      )
    )
      return;
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
        <div className="text-xs text-danger mb-2 max-w-[260px]">{error}</div>
      )}
      <Button
        onClick={onClick}
        disabled={disabled || busy}
        className="h-11"
      >
        <Banknote className="w-4 h-4" />
        {busy ? "Requesting…" : `Withdraw ${formatPrice(amount)}`}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
