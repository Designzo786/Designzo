"use client";

import Link from "next/link";
import { ChevronDown, Box, Mountain, Layers, Palette } from "lucide-react";
import { useDropdown } from "@/hooks/useDropdown";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  {
    slug: "3d-models",
    name: "3D Models",
    description: "Game-ready models, characters, props",
    icon: Box,
  },
  {
    slug: "textures",
    name: "Textures",
    description: "PBR textures, surfaces, decals",
    icon: Palette,
  },
  {
    slug: "hdris",
    name: "HDRIs",
    description: "Environment maps and skies",
    icon: Mountain,
  },
  {
    slug: "materials",
    name: "Materials",
    description: "Shaders and surface materials",
    icon: Layers,
  },
];

export function ExploreMenu() {
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();

  return (
    // Hover anywhere over the trigger OR the panel keeps the menu open.
    // Both live inside this wrapper, so the dropdown panel counts as a
    // descendant and crossing onto it does not fire onMouseLeave.
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        // Click still toggles — keeps the menu reachable for keyboard and
        // touch users who can't hover.
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
        // and uses pt-2 as a transparent, hoverable bridge — so moving the
        // cursor from the button to the panel never leaves the hover area.
        <div className="absolute top-full left-0 pt-2">
          <div
            role="menu"
            className="w-[480px] popover rounded-xl p-2 shadow-lg animate-fade-in grid grid-cols-2 gap-1"
          >
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
                  <div className="w-9 h-9 rounded-lg bg-accent-muted flex items-center justify-center text-accent-light group-hover:bg-accent/30 transition-colors shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-primary">
                      {cat.name}
                    </div>
                    <div className="text-xs text-muted mt-0.5 leading-snug">
                      {cat.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
