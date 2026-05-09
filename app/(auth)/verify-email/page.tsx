import Link from "next/link";
import { CheckCircle2, XCircle, Mail } from "lucide-react";
import { VerifyEmailClient } from "./VerifyEmailClient";

export const metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;

  // No token? Show a "check your inbox" prompt with optional resend.
  if (!email || !token) {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="inline-flex w-14 h-14 rounded-full bg-accent-muted items-center justify-center">
          <Mail className="w-7 h-7 text-accent-light" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Check your inbox
        </h1>
        <p className="text-sm text-secondary max-w-sm mx-auto">
          We sent you a verification link. Click it to activate your account.
          Be sure to check your spam folder.
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

  return <VerifyEmailClient email={email} token={token} />;
}

export { CheckCircle2, XCircle };
