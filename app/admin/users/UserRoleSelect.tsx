"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import type { Role } from "@prisma/client";

const ROLES: Role[] = ["USER", "CREATOR", "ADMIN"];

export function UserRoleSelect({
  userId,
  currentRole,
  disabled,
}: {
  userId: string;
  currentRole: Role;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(currentRole);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Role;
    if (next === role) return;

    if (next === "ADMIN") {
      const ok = await confirm({
        variant: "danger",
        title: "Grant ADMIN privileges?",
        body: "This user will have full access to the admin panel — moderating assets, approving collaborators, viewing all purchases, triggering payouts. Promote only people you fully trust.",
        confirmLabel: "Grant admin access",
      });
      if (!ok) {
        // Reset the <select> back to the current role visually.
        e.target.value = role;
        return;
      }
    }

    setError(null);
    const prev = role;
    setRole(next);

    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update.");
      setRole(prev);
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <>
      <div className="inline-flex flex-col items-end gap-1">
        <select
          aria-label="User role"
          value={role}
          onChange={onChange}
          disabled={disabled || pending}
          className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-elevated border border-border text-primary hover:border-border-hover focus:outline-none focus:border-border-focus disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {error && <span className="text-[10px] text-danger">{error}</span>}
      </div>
      {dialog}
    </>
  );
}
