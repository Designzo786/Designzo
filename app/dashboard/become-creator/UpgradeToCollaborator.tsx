"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  DollarSign,
  ShieldCheck,
  Check,
  Clock,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/utils";
import type { CreatorStatus } from "@prisma/client";

interface Props {
  initialStatus: CreatorStatus;
  decidedAt: Date | null;
}

const BENEFITS = [
  {
    icon: Upload,
    title: "Upload unlimited assets",
    body: "Publish 3D models, materials, and packs to the public marketplace.",
  },
  {
    icon: DollarSign,
    title: "Earn from every sale",
    body: "You keep the majority — the platform takes a small commission. Payouts settle to your bank.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Creator badge",
    body: "Once your KYC clears, buyers see a verified mark on your profile and listings.",
  },
];

export function UpgradeToCollaborator({ initialStatus, decidedAt }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<CreatorStatus>(initialStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  // Local "switch on" state — the toggle slides on after a successful submit
  // even though `status` only changes to PENDING. Gives the action immediate
  // visual feedback before the router refresh kicks in.
  const [switchedOn, setSwitchedOn] = useState(initialStatus !== "NONE");

  async function onUpgrade() {
    if (switchedOn) return; // already on / pending — nothing to do
    const ok = await confirm({
      variant: "info",
      title: "Apply as a Collaborator?",
      body: "Your application is sent to admins for review. While you wait, you stay a buyer-only account. Approval usually takes 1 business day.",
      confirmLabel: "Send application",
    });
    if (!ok) return;

    setError(null);
    setSwitchedOn(true); // optimistic

    const res = await fetch("/api/account/upgrade-to-collaborator", {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not submit your application.");
      setSwitchedOn(initialStatus !== "NONE");
      return;
    }
    setStatus("PENDING");
    startTransition(() => router.refresh());
  }

  return (
    <>
      <div className="space-y-6">
        {/* Status banner — only visible when there's something to report */}
        {status === "PENDING" && (
          <Alert variant="warning" title="Application under review" icon={Clock}>
            An admin is reviewing your application. You&apos;ll get a
            notification the moment a decision is made
            {decidedAt
              ? ` — submitted ${decidedAt.toLocaleDateString()}.`
              : "."}
          </Alert>
        )}
        {status === "REJECTED" && (
          <Alert
            variant="danger"
            title="Application not approved"
            icon={AlertCircle}
          >
            Your last application was declined. You can submit a new one below —
            include more detail in your profile bio first to improve the
            outcome.
          </Alert>
        )}

        {error && <Alert variant="danger" title="Something went wrong">{error}</Alert>}

        {/* The actual switch card */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/30 to-accent/5 border border-accent/30 flex items-center justify-center text-accent-light shrink-0 shadow-[0_0_24px_-6px_rgba(124,58,237,0.5)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-primary">
                    Collaborator account
                  </h2>
                  <p className="text-xs text-muted leading-relaxed mt-1">
                    Toggle on to send an upgrade application to admins. You can
                    keep using the platform as a buyer while you wait.
                  </p>
                </div>

                <SwitchControl
                  on={switchedOn}
                  disabled={pending || status === "PENDING" || status === "APPROVED"}
                  onClick={onUpgrade}
                  label={
                    status === "PENDING"
                      ? "Pending"
                      : status === "REJECTED"
                        ? "Re-apply"
                        : "Apply"
                  }
                />
              </div>

              {/* Benefits checklist */}
              <ul className="mt-5 space-y-3">
                {BENEFITS.map((b) => {
                  const Icon = b.icon;
                  return (
                    <li key={b.title} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-accent-muted text-accent-light flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-primary">
                          {b.title}
                        </div>
                        <div className="text-xs text-muted leading-snug mt-0.5">
                          {b.body}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* What happens next */}
        <div className="rounded-xl border border-border border-dashed bg-surface/50 p-5">
          <h3 className="text-sm font-semibold text-primary inline-flex items-center gap-2">
            <Check className="w-4 h-4 text-accent-light" />
            What happens after you apply
          </h3>
          <ol className="mt-3 space-y-2 text-xs text-secondary leading-relaxed">
            <li className="flex gap-2">
              <span className="text-muted font-mono shrink-0">1.</span>
              Admins review your application — usually within one business day.
            </li>
            <li className="flex gap-2">
              <span className="text-muted font-mono shrink-0">2.</span>
              You get an in-app notification and email the moment a decision is
              made.
            </li>
            <li className="flex gap-2">
              <span className="text-muted font-mono shrink-0">3.</span>
              On approval your role flips to Creator and the upload tools
              unlock. Complete your KYC at any time to become payout-eligible.
            </li>
          </ol>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="text-xs text-muted hover:text-primary transition-colors inline-flex items-center gap-1"
        >
          <ArrowRight className="w-3 h-3 rotate-180" />
          Back to dashboard
        </button>
      </div>
      {dialog}
    </>
  );
}

function SwitchControl({
  on,
  disabled,
  onClick,
  label,
}: {
  on: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-secondary">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on ? "true" : "false"}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          "disabled:cursor-not-allowed",
          on
            ? "bg-accent shadow-[0_0_16px_-2px_rgba(124,58,237,0.7)]"
            : "bg-elevated border border-border hover:border-border-hover",
          disabled && !on && "opacity-50"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
            on ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}
