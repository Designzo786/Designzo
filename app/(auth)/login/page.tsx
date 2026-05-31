"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { Alert } from "@/components/ui/Alert";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { AuthDivider } from "@/components/auth/AuthDivider";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

// Static shell shown while the Suspense boundary resolves useSearchParams()
// during the prerender pass. Mirrors the real header so there's no flash.
function LoginFallback() {
  return (
    <div className="text-center mb-7">
      <h1 className="text-2xl font-bold text-primary tracking-tight">
        Welcome back
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        Sign in to continue to Designo
      </p>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  // Coming back from /register — show a success banner and pre-fill the email
  // input so the user only types their password.
  const justRegistered = searchParams.get("registered") === "1";
  const prefillEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(prefillEmail);
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

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="text-center mb-7">
        <h1 className="text-2xl font-bold text-primary tracking-tight">
          {justRegistered ? "Account created" : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {justRegistered
            ? "Sign in below to start using Designo."
            : "Sign in to continue to Designo"}
        </p>
      </div>

      {justRegistered && (
        <div className="mb-5">
          <Alert variant="success" title="You're all set">
            Your account is ready. Sign in with the email and password you just
            chose.
          </Alert>
        </div>
      )}

      <GoogleButton callbackUrl={callbackUrl} label="Sign in with Google" />

      <AuthDivider />

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

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-muted hover:text-accent-light transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" disabled={loading} className="w-full h-11">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-accent-light hover:text-accent font-medium transition-colors"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
