import Link from "next/link";
import { unstable_cache } from "next/cache";
import {
  Box,
  Sparkles,
  Layers,
  Hexagon,
  Wand2,
  Palette,
  ArrowUpRight,
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
    icon: Box,
    accent: "text-violet-300 bg-violet-500/15 border-violet-400/30",
    bloom: "bg-violet-500/30",
    href: "/explore?category=3d-models",
    countable: true,
    badge: null,
  },
  {
    slug: "3d-icons",
    name: "3D Icons",
    icon: Hexagon,
    accent: "text-sky-300 bg-sky-500/15 border-sky-400/30",
    bloom: "bg-sky-500/30",
    href: "/explore?category=3d-icons",
    countable: true,
    badge: null,
  },
  {
    slug: "lottie",
    name: "Lottie Animations",
    icon: Sparkles,
    accent: "text-pink-300 bg-pink-500/15 border-pink-400/30",
    bloom: "bg-pink-500/30",
    href: "/explore?category=lottie",
    countable: true,
    badge: null,
  },
  {
    slug: "svg-icons",
    name: "SVG Icons",
    icon: Layers,
    accent: "text-emerald-300 bg-emerald-500/15 border-emerald-400/30",
    bloom: "bg-emerald-500/30",
    href: "/explore?category=svg-icons",
    countable: true,
    badge: null,
  },
  {
    slug: "materials",
    name: "Materials",
    icon: Palette,
    accent: "text-amber-300 bg-amber-500/15 border-amber-400/30",
    bloom: "bg-amber-500/30",
    href: "/explore?category=materials",
    countable: true,
    badge: null,
  },
  {
    slug: "ai-suite",
    name: "AI Suite",
    icon: Wand2,
    accent: "text-accent-light bg-accent/15 border-accent/40",
    bloom: "bg-accent/40",
    // AI Suite is a tool, not an asset category — keeps its icon-only
    // treatment so it visually reads as the action tile in the row.
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
    <section className="relative pt-0 pb-10 sm:pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top-right escape link */}
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Browse by format
          </h2>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-light hover:text-accent transition-colors group"
          >
            See all
            <ArrowUpRight className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Responsive layout:
              phone : horizontal scroll carousel (snap-x for tactile swipe)
              sm    : 2-col grid
              lg    : 3-col grid
              xl    : 6-col grid (perfect single row on wide displays)
            The negative-margin + padding trick lets cards scroll all the
            way to the edge of the viewport on phones instead of being
            constrained by the container's px-4 padding. */}
        <div className="scroll-row scroll-row--tile scroll-row--cols-2 scroll-row--cols-3 scroll-row--cols-6">
          {CARDS.map((card) => {
            const Icon = card.icon;
            const count = card.countable ? counts[card.slug] ?? 0 : null;
            return (
              <Link
                key={card.slug}
                href={card.href}
                className="group relative overflow-hidden rounded-2xl border border-border bg-surface hover:border-accent/30 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgba(124,58,237,0.35)]"
              >
                {/* NEW pill on the AI Suite tile */}
                {card.badge && (
                  <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-accent-light bg-accent-muted border border-accent/30">
                    <span className="w-1 h-1 rounded-full bg-accent-light animate-pulse" />
                    {card.badge}
                  </span>
                )}

                {/* Icon plate — single visual anchor for the whole card. */}
                <div className="relative inline-flex">
                  <span
                    aria-hidden
                    className={`absolute -inset-1.5 rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300 ${card.bloom}`}
                  />
                  <div
                    className={`relative w-11 h-11 rounded-xl border flex items-center justify-center ${card.accent}`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.6} />
                  </div>
                </div>

                {/* Title + count — single tight block, no tagline */}
                <h3 className="mt-4 text-[15px] font-semibold text-primary tracking-tight">
                  {card.name}
                </h3>
                <div className="mt-1 text-xs text-muted">
                  {count === null ? (
                    <span className="text-accent-light font-medium">
                      Try it now →
                    </span>
                  ) : count === 0 ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-accent-light animate-pulse" />
                      Coming soon
                    </span>
                  ) : (
                    <span>
                      <span className="text-primary font-semibold tabular-nums">
                        {formatCount(count)}
                      </span>{" "}
                      {count === 1 ? "asset" : "assets"}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
