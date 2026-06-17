"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import {
  CATEGORIES,
  FILE_TYPES,
  PRICE_RANGES,
  subcategoriesFor,
} from "@/lib/mock/assets";
import { cn } from "@/lib/utils";

/**
 * Filter sidebar — two faces, same content:
 *
 *  • Desktop (lg+): a sticky vertical sidebar to the left of the grid.
 *  • Phone / tablet (< lg): hidden by default; surfaced via the
 *    `<MobileFilterButton />` exported below, which opens a slide-up
 *    sheet containing the same filters. Avoids the previous mobile
 *    failure mode where three expanded filter groups stacked above
 *    the grid and the user had to scroll past ~30 options to see a
 *    single asset.
 */
export function FilterSidebar() {
  return (
    <aside className="hidden lg:block w-60 shrink-0 lg:sticky lg:top-20 lg:self-start">
      <FilterContent />
    </aside>
  );
}

/**
 * Phone/tablet filter trigger. Renders a button that reflects the
 * active-filter count and pops the same filter list inside a sheet.
 * Belongs in the results-row alongside the Sort dropdown.
 */
export function MobileFilterButton() {
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  // Active-filter count drives the badge on the button.
  const activeCount = [
    params.get("category"),
    params.get("subcategory"),
    params.get("price"),
    params.get("fileType"),
    params.get("q"),
  ].filter(Boolean).length;

  // Body-scroll lock + Escape-to-close while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium border bg-surface border-border text-secondary hover:text-primary hover:border-border-hover transition-colors"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Filter
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold bg-accent text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in cursor-default lg:hidden"
          />

          {/* Slide-up sheet — anchored to the bottom edge so the user's
              thumb is already near the controls when it opens. */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 lg:hidden",
              "max-h-[85dvh] overflow-y-auto",
              "bg-surface border-t border-border rounded-t-2xl shadow-[0_-30px_60px_-20px_rgba(0,0,0,0.5)]",
              "animate-[slide-up_0.25s_ease-out]"
            )}
          >
            {/* Pull-handle + header */}
            <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur border-b border-border">
              <div className="mx-auto mt-2 mb-1 w-10 h-1 rounded-full bg-border" />
              <div className="flex items-center justify-between px-5 py-3">
                <h2 className="text-base font-semibold text-primary">Filters</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-primary hover:bg-elevated transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-5 py-4">
              <FilterContent onChange={() => setOpen(false)} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

/** Shared filter UI used by both the desktop sidebar and the mobile sheet. */
function FilterContent({ onChange }: { onChange?: () => void } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
      onChange?.();
    },
    [params, pathname, router, onChange]
  );

  const clearAll = () => {
    router.push(pathname, { scroll: false });
    onChange?.();
  };

  const currentCategory = params.get("category");
  const currentSubcategory = params.get("subcategory");
  const currentPrice = params.get("price");
  const currentFileType = params.get("fileType");
  // Sub-category options depend on the currently-selected main category.
  // When no category is picked the list is empty and the whole filter
  // group is hidden — avoids dumping the full union of every type's
  // sub-categories onto the user.
  const subcategoryOptions = subcategoriesFor(currentCategory);

  // When the buyer switches main category the prior subcategory becomes
  // invalid (each category has its own list). Strip it from the URL so
  // the filter chips stay coherent.
  const setCategoryAndResetSubcategory = useCallback(
    (value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set("category", value);
      else next.delete("category");
      next.delete("subcategory");
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
      onChange?.();
    },
    [params, pathname, router, onChange]
  );

  const hasActive = !!(
    currentCategory ||
    currentSubcategory ||
    currentPrice ||
    currentFileType ||
    params.get("q")
  );

  return (
    <div>
      {/* "Filters" header is hidden inside the mobile sheet because the
          sheet has its own header — only the desktop sidebar wants this. */}
      <div className="hidden lg:flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-primary">Filters</h2>
        {hasActive && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-danger transition-colors"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Mobile-only "Clear all" — rendered inline since the sheet header
          doesn't include it. */}
      {hasActive && (
        <button
          type="button"
          onClick={clearAll}
          className="lg:hidden inline-flex items-center gap-1 text-xs text-muted hover:text-danger transition-colors mb-4"
        >
          <X className="w-3 h-3" />
          Clear all
        </button>
      )}

      <FilterGroup title="Category">
        <FilterOption
          label="All categories"
          active={!currentCategory}
          onClick={() => setCategoryAndResetSubcategory(null)}
        />
        {CATEGORIES.map((c) => (
          <FilterOption
            key={c.slug}
            label={c.name}
            active={currentCategory === c.slug}
            onClick={() => setCategoryAndResetSubcategory(c.slug)}
          />
        ))}
      </FilterGroup>

      {/* Sub-category — only shown when the buyer has picked a main
          category. Each category has its own list (see SUBCATEGORIES
          in lib/mock/assets.ts) so the options are scoped to what
          actually makes sense for the chosen surface. */}
      {subcategoryOptions.length > 0 && (
        <FilterGroup title="Sub-category">
          <FilterOption
            label="All sub-categories"
            active={!currentSubcategory}
            onClick={() => setParam("subcategory", null)}
          />
          {subcategoryOptions.map((s) => (
            <FilterOption
              key={s.slug}
              label={s.name}
              active={currentSubcategory === s.slug}
              onClick={() => setParam("subcategory", s.slug)}
            />
          ))}
        </FilterGroup>
      )}

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
    </div>
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
    <div className="mb-6 last:mb-0">
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
        type="button"
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
