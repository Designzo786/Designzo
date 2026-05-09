"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { X } from "lucide-react";
import { CATEGORIES, FILE_TYPES, PRICE_RANGES } from "@/lib/mock/assets";
import { cn } from "@/lib/utils";

export function FilterSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  const clearAll = () => router.push(pathname, { scroll: false });

  const currentCategory = params.get("category");
  const currentPrice = params.get("price");
  const currentFileType = params.get("fileType");

  const hasActive = !!(currentCategory || currentPrice || currentFileType || params.get("q"));

  return (
    <aside className="w-full lg:w-60 shrink-0 lg:sticky lg:top-20 lg:self-start">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-primary">Filters</h2>
        {hasActive && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-danger transition-colors"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      <FilterGroup title="Category">
        <FilterOption
          label="All categories"
          active={!currentCategory}
          onClick={() => setParam("category", null)}
        />
        {CATEGORIES.map((c) => (
          <FilterOption
            key={c.slug}
            label={c.name}
            active={currentCategory === c.slug}
            onClick={() => setParam("category", c.slug)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Price">
        <FilterOption
          label="Any price"
          active={!currentPrice}
          onClick={() => setParam("price", null)}
        />
        {PRICE_RANGES.map((r) => (
          <FilterOption
            key={r.slug}
            label={r.name}
            active={currentPrice === r.slug}
            onClick={() => setParam("price", r.slug)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="File type">
        <FilterOption
          label="Any type"
          active={!currentFileType}
          onClick={() => setParam("fileType", null)}
        />
        {FILE_TYPES.map((t) => (
          <FilterOption
            key={t.slug}
            label={t.name}
            active={currentFileType === t.slug}
            onClick={() => setParam("fileType", t.slug)}
          />
        ))}
      </FilterGroup>
    </aside>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2.5">
        {title}
      </h3>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function FilterOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors",
          active
            ? "bg-accent-muted text-accent-light font-medium"
            : "text-secondary hover:text-primary hover:bg-elevated"
        )}
      >
        {label}
      </button>
    </li>
  );
}
