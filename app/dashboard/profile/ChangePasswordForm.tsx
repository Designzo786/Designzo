"use client";

import { useState } from "react";
import { Lock, Check } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";

export function ChangePasswordForm({
  requiresCurrent,
}: {
  requiresCurrent: boolean;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (requiresCurrent && !current) {
      setError("Enter your current password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: requiresCurrent ? current : undefined,
          newPassword: next,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Could not change password.");
        setLoading(false);
        return;
      }

      setSaved(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={error} />

      {requiresCurrent && (
        <Input
          label="Current password"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          leftSlot={<Lock className="w-4 h-4" />}
        />
      )}

      <Input
        label="New password"
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        autoComplete="new-password"
        minLength={8}
        leftSlot={<Lock className="w-4 h-4" />}
        hint="At least 8 characters"
      />

      <Input
        label="Confirm new password"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        leftSlot={<Lock className="w-4 h-4" />}
      />

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={loading || !next}>
          {loading
            ? "Updating…"
            : requiresCurrent
              ? "Update password"
              : "Set password"}
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-xs text-accent-light animate-fade-in">
            <Check className="w-3.5 h-3.5" /> Password updated
          </span>
        )}
      </div>
    </form>
  );
}
