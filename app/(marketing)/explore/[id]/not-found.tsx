import Link from "next/link";
import { Search } from "lucide-react";

export default function AssetNotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl border border-border bg-surface flex items-center justify-center mb-6">
        <Search className="w-7 h-7 text-muted" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-2 text-primary">
        Asset not found
      </h1>
      <p className="text-secondary mb-6">
        The asset you&apos;re looking for doesn&apos;t exist or may have been
        removed.
      </p>
      <Link
        href="/explore"
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-accent to-accent-light text-white font-semibold shadow-[0_0_18px_rgba(124,58,237,0.3)]"
      >
        Browse Explore
      </Link>
    </div>
  );
}
