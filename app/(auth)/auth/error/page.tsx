import Link from "next/link";
import { AlertTriangle } from "lucide-react";

const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  Configuration: {
    title: "Server configuration error",
    message:
      "There's a problem with the auth configuration on our end. Please try again later.",
  },
  AccessDenied: {
    title: "Access denied",
    message: "You don't have permission to sign in.",
  },
  Verification: {
    title: "Link expired",
    message: "The sign-in link has expired or has already been used.",
  },
  OAuthAccountNotLinked: {
    title: "Account not linked",
    message:
      "An account with this email already exists. Please sign in with the original method you used.",
  },
  CredentialsSignin: {
    title: "Invalid credentials",
    message: "The email or password you entered is incorrect.",
  },
  Default: {
    title: "Something went wrong",
    message: "We couldn't sign you in. Please try again.",
  },
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error = "Default" } = await searchParams;
  const { title, message } = ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default;

  return (
    <>
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-danger-muted border border-danger/20 flex items-center justify-center mb-5">
          <AlertTriangle className="w-5 h-5 text-danger" />
        </div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">
          {title}
        </h1>
        <p className="mt-2 text-sm text-secondary leading-relaxed max-w-sm">
          {message}
        </p>

        <div className="mt-7 flex flex-col sm:flex-row gap-2.5 w-full">
          <Link
            href="/login"
            className="flex-1 h-11 px-4 rounded-lg gradient-accent text-white text-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            Try again
          </Link>
          <Link
            href="/"
            className="flex-1 h-11 px-4 rounded-lg bg-elevated border border-border text-primary text-sm font-medium flex items-center justify-center hover:bg-overlay transition-colors"
          >
            Go home
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted">
          Error code: <span className="font-mono">{error}</span>
        </p>
      </div>
    </>
  );
}
