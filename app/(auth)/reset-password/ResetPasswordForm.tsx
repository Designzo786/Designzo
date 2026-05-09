"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";

export function ResetPasswordForm({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not reset password.");
        setLoading(false);
        return;
      }
      setDone(true);
      // Redirect to login after a short pause so the user can read the confirmation
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="inline-flex w-14 h-14 rounded-full bg-info-muted items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-info" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Password updated
        </h1>
        <p className="text-sm text-secondary">
          Redirecting you to sign in…
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-7">
        <h1 className="text-2xl font-bold text-primary tracking-tight">
          Set a new password
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Resetting password for <span className="text-primary">{email}</span>
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />

        <Input
          label="New password"
          type={showPassword ? "text" : "password"}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftSlot={<Lock className="w-4 h-4" />}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-elevated transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        <Input
          label="Confirm new password"
          type={showPassword ? "text" : "password"}
          placeholder="Type it again"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftSlot={<Lock className="w-4 h-4" />}
        />

        <Button type="submit" disabled={loading} className="w-full h-11 mt-2">
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Remembered your password?{" "}
        <Link
          href="/login"
          className="text-accent-light hover:text-accent font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
