"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { formatPrice } from "@/lib/utils";

interface Props {
  assetId: string;
  assetTitle: string;
  priceCents: number;
  paypalConfigured: boolean;
}

export function CheckoutClient({
  assetId,
  assetTitle,
  priceCents,
  paypalConfigured,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(method: "paypal" | "mock") {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, method }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Payment failed.");
        setLoading(false);
        return;
      }

      router.push(`/dashboard/library?purchased=${assetId}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <div className="text-center pb-4 border-b border-border">
        <div className="text-xs text-muted uppercase tracking-wider">
          Total due
        </div>
        <div className="text-3xl font-bold gradient-text mt-1">
          {formatPrice(priceCents)}
        </div>
      </div>

      <FormError message={error} />

      {paypalConfigured ? (
        <Button
          onClick={() => pay("paypal")}
          disabled={loading}
          className="w-full h-11"
        >
          <CreditCard className="w-4 h-4" />
          {loading ? "Processing…" : "Pay with PayPal"}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-gold/20 bg-gold-muted p-3">
            <div className="text-xs font-semibold text-gold mb-1">
              Dev mode — PayPal not configured
            </div>
            <p className="text-[11px] text-secondary leading-relaxed">
              Set <code className="bg-canvas px-1 rounded">PAYPAL_CLIENT_ID</code>{" "}
              and <code className="bg-canvas px-1 rounded">PAYPAL_CLIENT_SECRET</code>{" "}
              in <code className="bg-canvas px-1 rounded">.env.local</code> to
              enable real PayPal sandbox checkout.
            </p>
          </div>

          <Button
            onClick={() => pay("mock")}
            disabled={loading}
            variant="gold"
            className="w-full h-11"
          >
            <Zap className="w-4 h-4" />
            {loading ? "Completing…" : "Complete (Dev — instant)"}
          </Button>
        </div>
      )}

      <p className="text-[11px] text-muted leading-relaxed text-center inline-flex items-center justify-center gap-1.5 w-full">
        <Lock className="w-3 h-3" />
        Encrypted payment · Cancel anytime
      </p>

      <p className="text-[11px] text-muted text-center leading-relaxed">
        By completing this purchase, you agree to the GameChanger Terms.
        You&apos;re buying:{" "}
        <span className="text-secondary">{assetTitle}</span>
      </p>
    </div>
  );
}
