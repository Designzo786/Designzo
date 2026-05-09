"use client";

import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";

export function AdminLoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      // signIn doesn't refresh the React session in v5; fetch fresh to verify role
      const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
      const session = await sessionRes.json().catch(() => null);

      if (session?.user?.role !== "ADMIN") {
        // Sign them out so they're not stuck in a half-authenticated state
        await signOut({ redirect: false });
        setError(
          "This account is not an administrator. Set ADMIN_EMAIL in your environment to your account's email and sign in again."
        );
        setLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      {/* Replace the purple ambient with a gold one for the admin context */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 35%, rgba(245,158,11,0.15), transparent 70%)",
        }}
      />

      <div className="text-center mb-7">
        <div className="mx-auto w-12 h-12 rounded-xl bg-gold-muted border border-gold/20 flex items-center justify-center text-gold mb-4">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">
          Admin Sign In
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Restricted area — administrators only
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />

        <Input
          label="Admin email"
          type="email"
          placeholder="admin@example.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftSlot={<Mail className="w-4 h-4" />}
        />

        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          autoComplete="current-password"
          required
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
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          }
        />

        <Button
          type="submit"
          variant="gold"
          disabled={loading}
          className="w-full h-11"
        >
          {loading ? "Verifying…" : "Sign in to admin panel"}
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-border space-y-2 text-center">
        <p className="text-xs text-muted">
          Not an admin?{" "}
          <Link
            href="/login"
            className="text-secondary hover:text-primary transition-colors"
          >
            Use regular sign in
          </Link>
        </p>
        <p className="text-[11px] text-muted leading-relaxed">
          Bootstrap an admin by setting{" "}
          <code className="px-1 py-0.5 rounded bg-elevated text-secondary text-[10px]">
            ADMIN_EMAIL
          </code>{" "}
          in your <code className="text-secondary">.env.local</code>, then
          register or sign in with that email.
        </p>
      </div>
    </>
  );
}
