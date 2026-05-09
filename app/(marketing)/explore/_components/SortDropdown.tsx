"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, ArrowUpDown, Check } from "lucide-react";
import { useDropdown } from "@/hooks/useDropdown";
import { SORT_OPTIONS } from "@/lib/mock/assets";
import { cn } from "@/lib/utils";

export function SortDropdown() {
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const current = params.get("sort") ?? "newest";
  const currentLabel =
    SORT_OPTIONS.find((s) => s.slug === current)?.name ?? "Newest";

  const setSort = (slug: string) => {
    const next = new URLSearchParams(params.toString());
    if (slug === "newest") next.delete("sort");
    else next.set("sort", slug);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium border transition-colors",
          open
            ? "bg-elevated border-border-hover text-primary"
            : "bg-surface border-border text-secondary hover:text-primary hover:border-border-hover"
        )}
      >
        <ArrowUpDown className="w-3.5 h-3.5" />
        <span>Sort: {currentLabel}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 w-56 popover rounded-xl p-1 shadow-lg animate-fade-in z-30"
        >
          {SORT_OPTIONS.map((opt) => {
            const active = current === opt.slug;
            return (
              <button
                key={opt.slug}
                role="menuitem"
                onClick={() => setSort(opt.slug)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "text-accent-light bg-accent-muted"
                    : "text-secondary hover:text-primary hover:bg-elevated"
                )}
              >
                {opt.name}
                {active && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
