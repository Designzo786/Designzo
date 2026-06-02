"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Menu,
  X,
  Box,
  Hexagon,
  Sparkles,
  Layers,
  Palette,
  Wand2,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Same category list the desktop ExploreMenu shows — kept in sync visually
// so phone users see the same hue mapping.
const CATEGORIES = [
  {
    slug: "3d-models",
    name: "3D Models",
    icon: Box,
    iconClass: "text-violet-300 bg-violet-500/15",
  },
  {
    slug: "3d-icons",
    name: "3D Icons",
    icon: Hexagon,
    iconClass: "text-sky-300 bg-sky-500/15",
  },
  {
    slug: "lottie",
    name: "Lottie Animations",
    icon: Sparkles,
    iconClass: "text-pink-300 bg-pink-500/15",
  },
  {
    slug: "svg-icons",
    name: "SVG Icons",
    icon: Layers,
    iconClass: "text-emerald-300 bg-emerald-500/15",
  },
  {
    slug: "materials",
    name: "Materials",
    icon: Palette,
    iconClass: "text-amber-300 bg-amber-500/15",
  },
];

/**
 * Mobile-only hamburger menu. Only renders the trigger button on phones
 * (`md:hidden`) — the desktop nav has its own ExploreMenu dropdown for the
 * same destinations. Opening the menu slides a full-width panel down from
 * under the navbar with the category list + AI Suite + the standard
 * Explore / AI Generate links.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the menu is open + close on Escape so users can
  // dismiss without hunting for the X button.
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
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-primary hover:bg-elevated transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <>
          {/* Backdrop — clicking dismisses */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in cursor-default"
          />

          {/* Slide-down panel — sits just below the 4rem-tall navbar */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className={cn(
              "fixed top-16 inset-x-0 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto",
              "bg-surface border-t border-border shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]",
              "animate-[slide-up_0.25s_ease-out]"
            )}
          >
            <div className="p-4 space-y-4">
              {/* Section: Quick actions */}
              <div>
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Quick actions
                </div>
                <Link
                  href="/explore"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-elevated transition-colors"
                >
                  <span className="w-9 h-9 rounded-lg bg-elevated border border-border text-accent-light flex items-center justify-center shrink-0">
                    <Compass className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-primary">
                      Explore marketplace
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      Browse every approved asset
                    </div>
                  </div>
                </Link>
                <Link
                  href="/ai-generate"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent-muted/40 transition-colors"
                >
                  <span className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/30 text-accent-light flex items-center justify-center shrink-0 shadow-[0_0_18px_-4px_rgba(124,58,237,0.7)]">
                    <Wand2 className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-primary">
                        AI Suite
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-accent-light bg-canvas/70 border border-accent/40">
                        <span className="w-1 h-1 rounded-full bg-accent-light animate-pulse" />
                        NEW
                      </span>
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      Generate assets from a prompt
                    </div>
                  </div>
                </Link>
              </div>

              {/* Section: Categories */}
              <div>
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Categories
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <Link
                        key={cat.slug}
                        href={`/explore?category=${cat.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-elevated transition-colors"
                      >
                        <span
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            cat.iconClass
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="text-sm font-medium text-primary truncate">
                          {cat.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sticky close button at the very top of the panel for easy reach */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-primary hover:bg-elevated transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
