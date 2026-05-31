"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Ban, RotateCcw } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import type { CreatorStatus } from "@prisma/client";

export function CreatorActions({
  userId,
  status,
}: {
  userId: string;
  status: CreatorStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  async function send(action: "APPROVE" | "REJECT") {
    setError(null);
    const res = await fetch(`/api/admin/creators/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Action failed.");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function onReject() {
    const ok = await confirm({
      variant: "danger",
      title: "Decline this application?",
      body: "The applicant will be notified that their collaborator request was not approved. They can still browse and buy assets.",
      confirmLabel: "Decline",
    });
    if (ok) await send("REJECT");
  }

  async function onRevoke() {
    const ok = await confirm({
      variant: "danger",
      title: "Revoke collaborator access?",
      body: (
        <>
          The user will be demoted back to a buyer-only account and the
          upload tools will relock instantly.
          {"\n\n"}
          Their existing approved assets stay published — buyers paid for
          them — but no new uploads will be allowed until you reinstate.
        </>
      ),
      confirmLabel: "Revoke access",
    });
    if (ok) await send("REJECT");
  }

  async function onReinstate() {
    const ok = await confirm({
      variant: "info",
      title: "Reinstate this collaborator?",
      body: "They'll regain upload access and be promoted back to Creator. Their next sign-in will pick up the change.",
      confirmLabel: "Reinstate",
    });
    if (ok) await send("APPROVE");
  }

  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        {error && <span className="text-xs text-danger mr-2">{error}</span>}

        {status === "PENDING" && (
          <>
            <button
              type="button"
              onClick={() => send("APPROVE")}
              disabled={pending}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-accent-light bg-accent-muted hover:bg-accent/20 border border-accent/20 transition-colors disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              Approve
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={pending}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-danger bg-danger-muted hover:bg-danger/20 border border-danger/20 transition-colors disabled:opacity-50"
            >
              <X className="w-3 h-3" />
              Reject
            </button>
          </>
        )}

        {status === "APPROVED" && (
          <button
            type="button"
            onClick={onRevoke}
            disabled={pending}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-danger bg-danger-muted hover:bg-danger/20 border border-danger/20 transition-colors disabled:opacity-50"
          >
            <Ban className="w-3 h-3" />
            Revoke
          </button>
        )}

        {status === "REJECTED" && (
          <button
            type="button"
            onClick={onReinstate}
            disabled={pending}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-accent-light bg-accent-muted hover:bg-accent/20 border border-accent/20 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
            Reinstate
          </button>
        )}
      </div>
      {dialog}
    </>
  );
}
