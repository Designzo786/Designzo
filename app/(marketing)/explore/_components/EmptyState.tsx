import Link from "next/link";
import { SearchX } from "lucide-react";

export function EmptyState({ query }: { query?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-2xl bg-elevated border border-border flex items-center justify-center mb-5">
        <SearchX className="w-6 h-6 text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-primary">No assets found</h3>
      <p className="mt-1.5 text-sm text-muted max-w-sm">
        {query
          ? `We couldn't find any matches for "${query}". Try a different search or adjust your filters.`
          : "No assets match your current filters. Try clearing some filters."}
      </p>
      <Link
        href="/explore"
        className="mt-6 h-9 px-4 rounded-lg text-sm font-medium gradient-accent text-white inline-flex items-center"
      >
        Reset filters
      </Link>
    </div>
  );
}
