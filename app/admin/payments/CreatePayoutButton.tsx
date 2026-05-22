"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote } from "lucide-react";

export function CreatePayoutButton({
  creatorId,
  amountLabel,
}: {
  creatorId: string;
  amountLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (
      !confirm(
        `Start a payout of ${amountLabel} for this creator? Their balance is moved into a pending payout you can then process.`
      )
    )
      return;
    setError(null);
    const res = await fetch("/api/admin/payouts/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not create payout.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-danger">{error}</span>}
      <button
        onClick={create}
        disabled={pending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-accent-light bg-accent-muted hover:bg-accent/20 border border-accent/20 transition-colors disabled:opacity-50"
      >
        <Banknote className="w-3.5 h-3.5" />
        Start payout
      </button>
    </div>
  );
}
