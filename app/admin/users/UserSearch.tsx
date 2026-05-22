"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

/**
 * Debounced search box for the admin users table. Pushes the query into the
 * URL (`?q=`) so the server component re-runs the filtered DB query.
 */
export function UserSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const firstRender = useRef(true);

  useEffect(() => {
    // Skip the effect on mount — only react to actual typing.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const query = q.trim();
      router.push(
        query ? `/admin/users?q=${encodeURIComponent(query)}` : "/admin/users"
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [q, router]);

  return (
    <div className="relative w-full sm:w-64">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name or email…"
        aria-label="Search users"
        autoComplete="off"
        className="w-full h-9 pl-9 pr-8 bg-input border border-border rounded-lg text-sm text-primary placeholder:text-muted focus:outline-none focus:border-border-focus focus:bg-surface transition-all"
      />
      {q && (
        <button
          type="button"
          onClick={() => setQ("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted hover:text-primary transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
