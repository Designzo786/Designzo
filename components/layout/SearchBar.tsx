"use client";

import { Search, Loader2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn, formatPrice } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** `sm` = navbar/tight inputs · `lg` = hero / prominent surfaces */
  size?: "sm" | "lg";
}

const SIZE = {
  sm: {
    input:
      "h-10 pl-10 pr-9 text-sm bg-input rounded-lg border-border focus:bg-surface",
    iconLeft: "left-3 w-4 h-4",
    iconRight: "right-3 w-4 h-4",
  },
  lg: {
    // Hero variant: rounded-2xl pill, slightly more opaque surface for
    // legibility against the violet hero glow, a baked-in soft accent halo so
    // it reads as "lifted", deeper on focus. Self-contained — callers do NOT
    // need to wrap it in their own glow div.
    input:
      "h-14 pl-12 pr-12 text-base bg-surface/80 rounded-2xl border-border-hover shadow-[0_0_60px_-18px_rgba(124,58,237,0.4)] hover:border-accent/40 focus:bg-surface focus:border-accent focus:shadow-[0_0_80px_-12px_rgba(124,58,237,0.65)]",
    iconLeft: "left-4 w-5 h-5",
    iconRight: "right-4 w-5 h-5",
  },
} as const;

interface SearchResult {
  id: string;
  title: string;
  price: number;
  category: string;
  previewKey: string | null;
}

const DEBOUNCE_MS = 250;
const MIN_CHARS = 1;

export function SearchBar({
  className,
  placeholder = "Search 3D models, materials…",
  autoFocus = false,
  size = "sm",
}: SearchBarProps) {
  const sz = SIZE[size];
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // -1 = no row highlighted (Enter runs a full search instead).
  const [activeIndex, setActiveIndex] = useState(-1);

  // ─── Debounced fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    const query = q.trim();
    if (query.length < MIN_CHARS) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/assets/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        const data = await res.json().catch(() => ({ results: [] }));
        setResults(data.results ?? []);
      } catch {
        // Aborted (newer keystroke) or network error — leave prior results.
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    // Cancel both the pending timer and any in-flight request when the
    // query changes again — stops a slow old response clobbering a new one.
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  // ─── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const goToSearch = useCallback(() => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/explore?q=${encodeURIComponent(trimmed)}`);
  }, [q, router]);

  function goToAsset(id: string) {
    setOpen(false);
    setQ("");
    router.push(`/explore/${id}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      goToAsset(results[activeIndex].id);
    } else {
      goToSearch();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    }
  }

  const query = q.trim();
  const showPanel = open && query.length >= MIN_CHARS;

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <form onSubmit={onSubmit} role="search">
        <Search
          className={cn(
            "absolute top-1/2 -translate-y-1/2 text-muted pointer-events-none",
            sz.iconLeft
          )}
        />
        {loading && (
          <Loader2
            className={cn(
              "absolute top-1/2 -translate-y-1/2 text-muted animate-spin",
              sz.iconRight
            )}
          />
        )}
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label="Search assets"
          autoComplete="off"
          className={cn(
            "w-full border text-primary placeholder:text-muted focus:outline-none transition-all",
            sz.input
          )}
        />
      </form>

      {showPanel && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 popover rounded-xl p-1.5 shadow-lg animate-fade-in">
          {results.length > 0 ? (
            <>
              <ul>
                {results.map((r, i) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => goToAsset(r.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
                        i === activeIndex ? "bg-elevated" : "hover:bg-elevated"
                      )}
                    >
                      {r.previewKey ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.previewKey}
                          alt=""
                          className="w-10 h-10 rounded-md object-cover bg-canvas shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-canvas shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-primary truncate">
                          {r.title}
                        </div>
                        <div className="text-xs text-muted capitalize">
                          {r.category.replace(/-/g, " ")}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "text-xs font-semibold shrink-0",
                          r.price === 0 ? "text-info" : "text-primary"
                        )}
                      >
                        {formatPrice(r.price)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={goToSearch}
                className="w-full mt-1 px-2 py-2 rounded-lg text-xs font-medium text-accent-light hover:bg-elevated transition-colors text-left"
              >
                See all results for “{query}”
              </button>
            </>
          ) : (
            !loading && (
              <div className="px-3 py-4 text-center text-xs text-muted">
                No assets found for “{query}”
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
