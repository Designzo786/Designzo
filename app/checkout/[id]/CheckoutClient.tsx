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
  razorpayConfigured: boolean;
  buyerName?: string | null;
  buyerEmail?: string | null;
}

type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", cb: (resp: unknown) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Not in browser"));
      return;
    }
    if (window.Razorpay) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SCRIPT_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Razorpay"))
      );
      return;
    }
    const s = document.createElement("script");
    s.src = RAZORPAY_SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

export function CheckoutClient({
  assetId,
  assetTitle,
  priceCents,
  razorpayConfigured,
  buyerName,
  buyerEmail,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function payWithRazorpay() {
    setError(null);
    setLoading(true);
    try {
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      });
      const orderData = await orderRes.json().catch(() => ({}));

      if (!orderRes.ok) {
        setError(orderData.error ?? "Could not start payment.");
        setLoading(false);
        return;
      }

      if (orderData.alreadyOwned) {
        router.push(`/dashboard/library?purchased=${assetId}`);
        router.refresh();
        return;
      }

      await loadRazorpayScript();
      if (!window.Razorpay) {
        setError("Razorpay failed to load. Check your network and try again.");
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Designo",
        description: orderData.assetTitle ?? assetTitle,
        order_id: orderData.orderId,
        prefill: {
          name: buyerName ?? undefined,
          email: buyerEmail ?? undefined,
        },
        notes: { assetId },
        theme: { color: "#7c3aed" },
        handler: async (response) => {
          try {
            const verifyRes = await fetch("/api/payments/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                assetId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json().catch(() => ({}));

            if (!verifyRes.ok) {
              setError(verifyData.error ?? "Payment verification failed.");
              setLoading(false);
              return;
            }

            router.push(`/dashboard/library?purchased=${assetId}`);
            router.refresh();
          } catch {
            setError("Payment verification failed. Contact support.");
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      });

      rzp.on("payment.failed", () => {
        setError("Payment failed. Please try again.");
        setLoading(false);
      });

      rzp.open();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function payMock() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, method: "mock" }),
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

      {razorpayConfigured ? (
        <Button
          onClick={payWithRazorpay}
          disabled={loading}
          className="w-full h-11"
        >
          <CreditCard className="w-4 h-4" />
          {loading ? "Processing…" : "Pay with Razorpay"}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-gold/20 bg-gold-muted p-3">
            <div className="text-xs font-semibold text-gold mb-1">
              Dev mode — Razorpay not configured
            </div>
            <p className="text-[11px] text-secondary leading-relaxed">
              Set <code className="bg-canvas px-1 rounded">RAZORPAY_KEY_ID</code>{" "}
              and{" "}
              <code className="bg-canvas px-1 rounded">RAZORPAY_KEY_SECRET</code>{" "}
              in <code className="bg-canvas px-1 rounded">.env.local</code> to
              enable real Razorpay checkout.
            </p>
          </div>

          <Button
            onClick={payMock}
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
        By completing this purchase, you agree to the Designo Terms.
        You&apos;re buying:{" "}
        <span className="text-secondary">{assetTitle}</span>
      </p>
    </div>
  );
}
