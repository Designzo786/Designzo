"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
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

  async function decide(action: "APPROVE" | "REJECT") {
    if (
      action === "REJECT" &&
      !confirm("Decline this collaborator application?")
    ) {
      return;
    }
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

  if (status !== "PENDING") {
    return <span className="text-xs text-muted">No actions available</span>;
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      {error && <span className="text-xs text-danger mr-2">{error}</span>}
      <button
        onClick={() => decide("APPROVE")}
        disabled={pending}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-accent-light bg-accent-muted hover:bg-accent/20 border border-accent/20 transition-colors disabled:opacity-50"
      >
        <Check className="w-3 h-3" />
        Approve
      </button>
      <button
        onClick={() => decide("REJECT")}
        disabled={pending}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-danger bg-danger-muted hover:bg-danger/20 border border-danger/20 transition-colors disabled:opacity-50"
      >
        <X className="w-3 h-3" />
        Reject
      </button>
    </div>
  );
}
