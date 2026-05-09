import Link from "next/link";
import { Compass, Home } from "lucide-react";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl border border-border bg-surface flex items-center justify-center mb-6 text-muted">
        <Compass className="w-7 h-7" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-2 gradient-text">
        404
      </h1>
      <p className="text-sm text-secondary mb-6">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <div className="flex justify-center gap-2">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-secondary bg-elevated border border-border hover:border-border-hover hover:text-primary transition-colors"
        >
          <Compass className="w-4 h-4" />
          Browse marketplace
        </Link>
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
