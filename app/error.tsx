"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook for Sentry / error monitoring later. The `digest` field is the
    // server-assigned ID for this error — it's the same ID logged in the
    // server output, so support can correlate user reports to logs.
    console.error("[client error]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl border border-danger/20 bg-danger-muted flex items-center justify-center mb-6 text-danger">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-2 text-primary">
        Something went wrong
      </h1>
      <p className="text-sm text-secondary mb-6 leading-relaxed">
        We hit an unexpected error rendering this page. The team has been
        notified.{" "}
        {error.digest && (
          <span className="block mt-2 text-xs text-muted">
            Reference: <code className="font-mono">{error.digest}</code>
          </span>
        )}
      </p>
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-primary bg-elevated border border-border hover:border-border-hover transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white gradient-accent shadow-[0_0_18px_rgba(124,58,237,0.3)]"
        >
          <Home className="w-4 h-4" />
          Go home
        </Link>
      </div>
    </div>
  );
}
