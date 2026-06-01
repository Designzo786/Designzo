"use client";

import Link from "next/link";
import {
  ChevronDown,
  Box,
  Hexagon,
  Sparkles,
  Layers,
  Palette,
  Wand2,
  ArrowUpRight,
} from "lucide-react";
import { useDropdown } from "@/hooks/useDropdown";
import { cn } from "@/lib/utils";

// Categories shown in the dropdown — order matches the home-page tile row
// so users build a consistent mental map of "what's on Designzo".
const CATEGORIES = [
  {
    slug: "3d-models",
    name: "3D Models",
    description: "Game-ready models, characters, props",
    icon: Box,
    iconClass: "text-violet-300 bg-violet-500/15",
  },
  {
    slug: "3d-icons",
    name: "3D Icons",
    description: "Royalty-free 3D icons in PNG + glTF",
    icon: Hexagon,
    iconClass: "text-sky-300 bg-sky-500/15",
  },
  {
    slug: "lottie",
    name: "Lottie Animations",
    description: "Lightweight JSON animations for web & apps",
    icon: Sparkles,
    iconClass: "text-pink-300 bg-pink-500/15",
  },
  {
    slug: "svg-icons",
    name: "SVG Icons",
    description: "Scalable SVG icons in every style",
    icon: Layers,
    iconClass: "text-emerald-300 bg-emerald-500/15",
  },
  {
    slug: "materials",
    name: "Materials",
    description: "PBR materials, shaders, surfaces",
    icon: Palette,
    iconClass: "text-amber-300 bg-amber-500/15",
  },
];

export function ExploreMenu() {
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();

  return (
    // Hover anywhere over the trigger OR the panel keeps the menu open —
    // both live inside this wrapper so crossing onto the panel doesn't
    // count as leaving.
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        // Click still toggles — keyboard + touch users can't hover.
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors",
          open
            ? "text-primary bg-elevated"
            : "text-secondary hover:text-primary hover:bg-elevated"
        )}
      >
        Explore
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        // Outer wrapper sits flush against the button (top-full, no margin)
        // and uses pt-2 as a transparent, hoverable bridge.
        <div className="absolute top-full left-0 pt-2">
          <div
            role="menu"
            className="w-[520px] popover rounded-xl shadow-lg animate-fade-in overflow-hidden"
          >
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-border">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Asset categories
              </div>
            </div>

            {/* Two-column category grid */}
            <div className="p-2 grid grid-cols-2 gap-1">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.slug}
                    href={`/explore?category=${cat.slug}`}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                    className="flex gap-3 p-3 rounded-lg hover:bg-elevated transition-colors group"
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                        cat.iconClass
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-primary">
                        {cat.name}
                      </div>
                      <div className="text-xs text-muted mt-0.5 leading-snug truncate">
                        {cat.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* AI Suite footer call-out — distinct treatment so it reads
                as a tool, not just another category */}
            <Link
              href="/ai-generate"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="group flex items-center gap-3 px-3 py-3 border-t border-border bg-accent-muted/30 hover:bg-accent-muted/60 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center text-accent-light shrink-0 shadow-[0_0_18px_-4px_rgba(124,58,237,0.7)]">
                <Wand2 className="w-4 h-4" />
              </div>
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
                <div className="text-xs text-muted mt-0.5 leading-snug">
                  Generate 3D models &amp; animations from a prompt
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
