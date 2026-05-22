"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ShoppingBag,
  Upload,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { cn } from "@/lib/utils";

type AccountType = "user" | "collaborator";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // A "Become a creator" link arrives with ?type=collaborator — pre-select
  // that tab so the user doesn't have to switch it themselves.
  const initialType: AccountType =
    searchParams.get("type") === "collaborator" ? "collaborator" : "user";

  const [accountType, setAccountType] = useState<AccountType>(initialType);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!acceptedTerms) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          acceptedTerms,
          accountType,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // Don't auto-sign-in — push them through email verification first.
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="text-center mb-7">
        <h1 className="text-2xl font-bold text-primary tracking-tight">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Join thousands of creators and collectors
        </p>
      </div>

      <GoogleButton label="Sign up with Google" />

      <AuthDivider />

      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />

        {/* ─── Account type ──────────────────────────────────────────────── */}
        <div>
          <span className="block text-xs font-medium text-secondary mb-2">
            I want to join as
          </span>
          <div className="grid grid-cols-2 gap-3">
            <AccountTypeCard
              selected={accountType === "user"}
              onSelect={() => setAccountType("user")}
              icon={ShoppingBag}
              title="User"
              description="Browse and buy assets"
            />
            <AccountTypeCard
              selected={accountType === "collaborator"}
              onSelect={() => setAccountType("collaborator")}
              icon={Upload}
              title="Collaborator"
              description="Upload and sell assets"
            />
          </div>
        </div>

        <Input
          label="Full name"
          type="text"
          placeholder="Jane Doe"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftSlot={<User className="w-4 h-4" />}
        />

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
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          }
          hint="Use 8+ characters with a mix of letters, numbers & symbols"
        />

        <label className="flex items-start gap-3 text-xs text-secondary leading-relaxed cursor-pointer select-none">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-border bg-input text-accent focus:ring-2 focus:ring-accent/40 focus:ring-offset-0 cursor-pointer shrink-0"
            required
          />
          <span>
            I agree to the{" "}
            <Link
              href="/terms"
              target="_blank"
              className="text-accent-light hover:text-accent underline underline-offset-2"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="text-accent-light hover:text-accent underline underline-offset-2"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <Button
          type="submit"
          disabled={loading || !acceptedTerms}
          className="w-full h-11 mt-2"
        >
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
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

function AccountTypeCard({
  selected,
  onSelect,
  icon: Icon,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: typeof User;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative text-left rounded-xl border p-3.5 transition-colors",
        selected
          ? "border-accent bg-accent-muted"
          : "border-border bg-surface hover:border-border-hover"
      )}
    >
      {selected && (
        <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </span>
      )}
      <Icon
        className={cn(
          "w-5 h-5 mb-2",
          selected ? "text-accent-light" : "text-muted"
        )}
      />
      <div className="text-sm font-semibold text-primary">{title}</div>
      <div className="text-[11px] text-muted leading-snug mt-0.5">
        {description}
      </div>
    </button>
  );
}
