import Link from "next/link";
import { unstable_cache } from "next/cache";
import {
  Box,
  Sparkles,
  Layers,
  Hexagon,
  Wand2,
  ArrowUpRight,
  Palette,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

/**
 * Category cards — simplified premium treatment.
 *
 * Earlier versions used per-card gradient backdrops (a radial+linear stack
 * tinted to each category's hue). User feedback was to strip the background
 * light and keep the cards clean and product-like. The hue now lives only in
 * the icon plate and a tiny ring around it — the card surface itself is the
 * standard dark surface that re-tints with the active theme.
 */
const CARDS = [
  {
    slug: "3d-models",
    name: "3D Models",
    tagline: "Premium 3D models, characters and props in glTF + GLB.",
    icon: Box,
    accent: "text-violet-300 bg-violet-500/15 border-violet-400/30",
    bloom: "bg-violet-500/30",
    image: "/categories/3d-models.webp",
    href: "/explore?category=3d-models",
    countable: true,
    badge: null,
  },
  {
    slug: "3d-icons",
    name: "3D Icons",
    tagline: "Royalty-free 3D icons in PNG + glTF, ready for any product.",
    icon: Hexagon,
    accent: "text-sky-300 bg-sky-500/15 border-sky-400/30",
    bloom: "bg-sky-500/30",
    image: "/categories/3d-icons.webp",
    href: "/explore?category=3d-icons",
    countable: true,
    badge: null,
  },
  {
    slug: "lottie",
    name: "Lottie Animations",
    tagline: "Lightweight JSON animations for web & app micro-interactions.",
    icon: Sparkles,
    accent: "text-pink-300 bg-pink-500/15 border-pink-400/30",
    bloom: "bg-pink-500/30",
    image: "/categories/lottie.webp",
    href: "/explore?category=lottie",
    countable: true,
    badge: null,
  },
  {
    slug: "svg-icons",
    name: "SVG Icons",
    tagline: "Scalable SVG icons in every style — outline, filled, duotone.",
    icon: Layers,
    accent: "text-emerald-300 bg-emerald-500/15 border-emerald-400/30",
    bloom: "bg-emerald-500/30",
    image: "/categories/svg-icons.webp",
    href: "/explore?category=svg-icons",
    countable: true,
    badge: null,
  },
  {
    slug: "materials",
    name: "Materials",
    tagline: "PBR materials, shaders, and surface textures.",
    icon: Palette,
    accent: "text-amber-300 bg-amber-500/15 border-amber-400/30",
    bloom: "bg-amber-500/30",
    image: "/categories/materials.webp",
    href: "/explore?category=materials",
    countable: true,
    badge: null,
  },
  {
    slug: "ai-suite",
    name: "AI Suite",
    tagline: "Generate 3D models and animations from a single prompt.",
    icon: Wand2,
    accent: "text-accent-light bg-accent/15 border-accent/40",
    bloom: "bg-accent/40",
    // AI Suite is a tool, not an asset category — keeps its icon-only
    // treatment so it visually reads as the action tile in the row.
    image: null,
    href: "/ai-generate",
    countable: false,
    badge: "NEW",
  },
] as const;

// Live count of APPROVED assets per category, cached 60s and purged by the
// "assets" tag on admin approve/reject. Wrapped so a DB outage doesn't crash
// the home page — categories just render with zero counts instead.
const fetchCategoryCounts = unstable_cache(
  async () => {
    const counts: Record<string, number> = {};
    try {
      const rows = await prisma.asset.groupBy({
        by: ["category"],
        where: { status: "APPROVED" },
        _count: { _all: true },
      });
      for (const r of rows) counts[r.category] = r._count._all;
    } catch (err) {
      console.error("[home/Categories] count failed:", err);
    }
    return counts;
  },
  ["home-category-counts-v4"],
  { tags: ["assets"], revalidate: 60 }
);

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K+`;
  return String(n);
}

export async function Categories() {
  const counts = await fetchCategoryCounts();

  return (
    <section className="relative pt-0 pb-20 sm:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top-right escape link */}
        <div className="flex justify-end mb-5 sm:mb-6">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-light hover:text-accent transition-colors group"
          >
            Browse all assets
            <ArrowUpRight className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Responsive grid:
              phone : 1 col
              sm    : 2 cols
              lg    : 3 cols
              xl    : 6 cols (perfect single row on wide displays) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-5">
          {CARDS.map((card) => {
            const Icon = card.icon;
            const count = card.countable ? counts[card.slug] ?? 0 : null;
            return (
              <Link
                key={card.slug}
                href={card.href}
                className="group relative overflow-hidden rounded-2xl border border-border bg-surface hover:border-border-hover flex flex-col transition-all duration-300 hover:-translate-y-1"
              >
                {/* NEW pill on the AI Suite tile */}
                {card.badge && (
                  <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-accent-light bg-accent-muted border border-accent/30">
                    <span className="w-1 h-1 rounded-full bg-accent-light animate-pulse" />
                    {card.badge}
                  </span>
                )}

                {/* Top text content */}
                <div className="p-5 sm:p-6 flex flex-col gap-4 flex-1">
                  {/* Icon plate — kept on every card. Doubles as the
                      'always visible' visual anchor when the image is
                      missing or slow to load, and adds brand-hue
                      consistency across the row. */}
                  <div className="relative">
                    <span
                      aria-hidden
                      className={`absolute -inset-2 rounded-2xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-300 ${card.bloom}`}
                    />
                    <div
                      className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center ${card.accent}`}
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.6} />
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-primary tracking-tight">
                      {card.name}
                    </h3>
                    <p className="text-[13px] text-secondary leading-relaxed mt-1.5 line-clamp-3">
                      {card.tagline}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-1">
                  {count === null ? (
                    <span className="text-sm font-semibold text-accent-light">
                      Try it now
                    </span>
                  ) : count === 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-light animate-pulse" />
                      <span className="text-sm font-medium text-secondary">
                        Coming soon
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-primary tabular-nums tracking-tight">
                        {formatCount(count)}
                      </span>
                      <span className="text-[11px] text-muted">
                        {count === 1 ? "asset" : "assets"}
                      </span>
                    </div>
                  )}
                  <span className="w-8 h-8 rounded-full border border-border bg-elevated flex items-center justify-center text-muted group-hover:text-primary group-hover:border-border-hover transition-all">
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                  </div>
                </div>

                {/* Hero image — overflows to all three bottom edges. Falls
                    back gracefully: if /categories/{slug}.webp is missing
                    (404), the broken <img> hides itself via onError and
                    the card just shows the text + icon content. */}
                {card.image && (
                  <div className="relative h-32 sm:h-36 overflow-hidden bg-elevated">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.image}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                    {/* Soft gradient overlay to ease the image into the
                        card surface above — keeps the visual weight on
                        the text content. */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-linear-to-b from-surface to-transparent"
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
