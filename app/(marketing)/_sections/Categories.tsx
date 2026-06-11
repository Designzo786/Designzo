import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import {
  Box,
  Sparkles,
  Layers,
  Hexagon,
  Wand2,
  ArrowUpRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

// Hero artwork is uploaded to R2 once by scripts/upload-category-heroes.mjs
// under deterministic keys. Re-running the script overwrites the same keys,
// so swapping the art doesn't require a code change. Hostname is whitelisted
// in next.config.ts → images.remotePatterns ("*.r2.dev").
const R2_HERO_BASE =
  "https://pub-471747289587402a92b17615e1089adb.r2.dev/public/categories";

/**
 * Category cards — hero image + icon plate.
 *
 * Each card has an optional `image` field pointing at a transparent PNG in
 * `/public/categories/`. When present, the image renders as the hero
 * thumbnail at the top of the card and the icon plate shrinks to a small
 * floating chip in the corner so the category hue still reads at a glance.
 * If the image is missing the card falls back to the icon-only layout —
 * this keeps the home page render-safe while images are still being added.
 *
 * Hue mapping: the same violet / sky / pink / emerald / accent palette the
 * rest of the marketing surface uses, so a buyer's mental model stays
 * consistent across Hero → Categories → CategoryShowcase rails.
 */
const CARDS = [
  {
    slug: "3d-models",
    name: "3D Models",
    icon: Box,
    accent: "text-violet-300 bg-violet-500/15 border-violet-400/30",
    bloom: "bg-violet-500/30",
    heroTint: "from-violet-500/15 to-transparent",
    image: `${R2_HERO_BASE}/3d-models.png`,
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
    heroTint: "from-sky-500/15 to-transparent",
    image: `${R2_HERO_BASE}/3d-icons.png`,
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
    heroTint: "from-pink-500/15 to-transparent",
    image: `${R2_HERO_BASE}/lottie.png`,
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
    heroTint: "from-emerald-500/15 to-transparent",
    image: `${R2_HERO_BASE}/svg-icons.png`,
    href: "/explore?category=svg-icons",
    countable: true,
    badge: null,
  },
  {
    slug: "ai-suite",
    name: "AI Suite",
    icon: Wand2,
    accent: "text-accent-light bg-accent/15 border-accent/40",
    bloom: "bg-accent/40",
    heroTint: "from-accent/15 to-transparent",
    image: `${R2_HERO_BASE}/ai-suite.png`,
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
    <section className="relative pt-8 sm:pt-12 pb-10 sm:pb-16">
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
        <div className="scroll-row scroll-row--tile scroll-row--cols-2 scroll-row--cols-3 scroll-row--cols-5">
          {CARDS.map((card) => {
            const Icon = card.icon;
            const count = card.countable ? counts[card.slug] ?? 0 : null;
            return (
              <Link
                key={card.slug}
                href={card.href}
                className="group relative overflow-hidden rounded-2xl border border-border bg-surface hover:border-accent/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgba(124,58,237,0.35)] flex flex-col"
              >
                {/* NEW pill on the AI Suite tile — sits over the hero image */}
                {card.badge && (
                  <span className="absolute top-3 right-3 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-accent-light bg-canvas/80 backdrop-blur border border-accent/30">
                    <span className="w-1 h-1 rounded-full bg-accent-light animate-pulse" />
                    {card.badge}
                  </span>
                )}

                {/* Hero image — fills the upper portion of the card. Falls
                    back to the icon plate centered in the same region when
                    the PNG hasn't been added yet, so the layout stays
                    consistent even before art ships. A subtle category-
                    tinted gradient sits behind the transparent PNG so the
                    cut-out artwork blends into the dark surface instead of
                    floating on it. */}
                <div className="relative aspect-[5/4] w-full overflow-hidden bg-canvas">
                  <div
                    aria-hidden
                    className={`absolute inset-0 bg-gradient-to-br ${card.heroTint}`}
                  />
                  <div
                    aria-hidden
                    className={`absolute -bottom-10 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full blur-2xl opacity-40 ${card.bloom}`}
                  />
                  <Image
                    src={card.image}
                    alt={card.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="relative object-contain p-4 transition-transform duration-500 group-hover:scale-110"
                  />

                  {/* Icon plate badge — keeps the category hue legible
                      even when the hero PNG is colourful. Floats over the
                      bottom-left of the hero region. */}
                  <div
                    className={`absolute bottom-2.5 left-2.5 z-10 w-8 h-8 rounded-lg border flex items-center justify-center backdrop-blur ${card.accent}`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.7} />
                  </div>
                </div>

                {/* Title + count — same tight block as before, just below
                    the hero now. */}
                <div className="p-4">
                  <h3 className="text-[15px] font-semibold text-primary tracking-tight">
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
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
