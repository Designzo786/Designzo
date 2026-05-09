import Link from "next/link";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;

  if (!email || !token) {
    return (
      <div className="text-center space-y-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Invalid reset link
        </h1>
        <p className="text-sm text-secondary max-w-sm mx-auto">
          The link is missing required information. Request a new one to reset
          your password.
        </p>
        <div className="pt-2">
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-semibold text-white gradient-accent shadow-[0_0_24px_rgba(124,58,237,0.4)] hover:shadow-[0_0_32px_rgba(124,58,237,0.6)] transition-shadow"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return <ResetPasswordForm email={email} token={token} />;
}
