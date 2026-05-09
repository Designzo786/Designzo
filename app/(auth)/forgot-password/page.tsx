"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not send reset link.");
        setLoading(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="inline-flex w-14 h-14 rounded-full bg-info-muted items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-info" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Check your inbox
        </h1>
        <p className="text-sm text-secondary max-w-sm mx-auto">
          If an account exists for <span className="text-primary">{email}</span>,
          we&apos;ve sent a reset link. The link is valid for 1 hour.
        </p>
        <p className="text-xs text-muted">
          Didn&apos;t get an email? Check your spam folder.
        </p>
        <div className="pt-2">
          <Link
            href="/login"
            className="text-sm text-accent-light hover:text-accent transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-7">
        <h1 className="text-2xl font-bold text-primary tracking-tight">
          Forgot your password?
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftSlot={<Mail className="w-4 h-4" />}
        />

        <Button type="submit" disabled={loading} className="w-full h-11">
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{" "}
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
