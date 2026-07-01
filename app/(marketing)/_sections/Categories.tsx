import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import {
  ArrowUpRight,
  Box,
  Hexagon,
  Sparkles,
  Layers,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

// Hero artwork is uploaded to R2 once by scripts/upload-category-heroes.mjs
// under deterministic keys. Re-running the script overwrites the same keys,
// so swapping the art doesn't require a code change. Hostname is whitelisted
// in next.config.ts → images.remotePatterns ("*.r2.dev").
const R2_HERO_BASE =
  "https://pub-471747289587402a92b17615e1089adb.r2.dev/public/categories";

/**
 * Category cards — character pop-out layout.
 *
 * Each tile is a coloured platform; a large hero figure sits centred above
 * it, top half in empty space and bottom half overlapping the platform.
 *
 * `image` is OPTIONAL per card. When set, the hero PNG is rendered via
 * next/image (R2 + image optimizer). When it's null, the card falls back
 * to its lucide `icon` rendered large with the same drop-shadow treatment
 * — same silhouette, same vertical rhythm, no broken-image squares while
 * artwork is being swapped out.
 *
 * To enable a card's hero PNG: set `image: \`${R2_HERO_BASE}/<slug>.png\``
 * and run `node --env-file=.env scripts/upload-category-heroes.mjs`.
 */
type CardImage = string | null;

interface Card {
  slug: string;
  name: string;
  icon: LucideIcon;
  platformTint: string;
  image: CardImage;
  href: string;
  countable: boolean;
  badge: string | null;
}

const CARDS: readonly Card[] = [
  {
    slug: "3d-models",
    name: "3D Models",
    icon: Box,
    platformTint:
      "from-violet-500/25 via-violet-600/20 to-violet-900/40 border-violet-400/30",
    image: `${R2_HERO_BASE}/3d-models.png?v=2`,
    href: "/explore?category=3d-models",
    countable: true,
    badge: null,
  },
  {
    slug: "3d-icons",
    name: "3D Icons",
    icon: Hexagon,
    platformTint:
      "from-sky-500/25 via-sky-600/20 to-sky-900/40 border-sky-400/30",
    image: `${R2_HERO_BASE}/3d-icons.png`,
    href: "/explore?category=3d-icons",
    countable: true,
    badge: null,
  },
  {
    slug: "lottie",
    name: "Lottie Animations",
    icon: Sparkles,
    platformTint:
      "from-pink-500/25 via-pink-600/20 to-pink-900/40 border-pink-400/30",
    image: `${R2_HERO_BASE}/lottie.png`,
    href: "/explore?category=lottie",
    countable: true,
    badge: null,
  },
  {
    slug: "svg-icons",
    name: "SVG Icons",
    icon: Layers,
    platformTint:
      "from-emerald-500/25 via-emerald-600/20 to-emerald-900/40 border-emerald-400/30",
    image: `${R2_HERO_BASE}/svg-icons.png`,
    href: "/explore?category=svg-icons",
    countable: true,
    badge: null,
  },
  {
    slug: "ai-suite",
    name: "AI Suite",
    icon: Wand2,
    platformTint:
      "from-accent/30 via-accent/20 to-accent/50 border-accent/40",
    image: `${R2_HERO_BASE}/ai-suite.png`,
    href: "/ai-generate",
    countable: false,
    badge: "NEW",
  },
];

// `R2_HERO_BASE` is referenced by the future-image-enabled cards above; the
// lint rule otherwise flags it as unused while every card is on the icon
// fallback. Re-export so the constant stays attached to the module surface
// and round-trips through tsc cleanly when an image: field gets flipped on.
export { R2_HERO_BASE };

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
  ["home-category-counts-v5"],
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
              xl    : 5-col grid (perfect single row on wide displays) */}
        <div className="scroll-row scroll-row--tile scroll-row--cols-2 scroll-row--cols-3 scroll-row--cols-5">
          {CARDS.map((card) => {
            const Icon = card.icon;
            const count = card.countable ? counts[card.slug] ?? 0 : null;
            return (
              <Link
                key={card.slug}
                href={card.href}
                className="group relative block transition-transform duration-300 hover:-translate-y-1"
              >
                {/* Hero region — fixed-size square at the top, centred.
                    Renders the R2 PNG when one is configured, else the
                    lucide icon at large size. Either way the silhouette
                    sits in the same box and overlaps the platform below
                    by the same amount via the platform's negative
                    margin-top. */}
                <div className="relative aspect-square w-40 sm:w-44 mx-auto z-10 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1">
                  {card.image ? (
                    <Image
                      src={card.image}
                      alt={card.name}
                      fill
                      sizes="(max-width: 640px) 144px, (max-width: 1024px) 160px, 180px"
                      className="object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)]"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)]">
                      <Icon
                        className="w-20 h-20 sm:w-24 sm:h-24 text-white/95"
                        strokeWidth={1.2}
                      />
                    </div>
                  )}
                </div>

                {/* Platform — the visible card. The negative margin-top
                    pulls it up to overlap the bottom of the hero figure
                    so the silhouette looks like it's standing on the
                    pedestal. */}
                <div
                  className={`relative -mt-16 sm:-mt-18 rounded-2xl border bg-gradient-to-br ${card.platformTint} px-3 pt-18 sm:pt-20 pb-5 text-center shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)] group-hover:shadow-[0_16px_36px_-16px_rgba(124,58,237,0.5)] transition-shadow duration-300`}
                >
                  {card.badge && (
                    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-white bg-black/40 backdrop-blur border border-white/15">
                      <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                      {card.badge}
                    </span>
                  )}

                  <h3 className="text-[14px] sm:text-[15px] font-semibold text-white tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                    {card.name}
                  </h3>
                  <div className="mt-1 text-[11px] text-white/85">
                    {count === null ? (
                      <span className="font-medium">Try it now →</span>
                    ) : count === 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-white/90 animate-pulse" />
                        Coming soon
                      </span>
                    ) : (
                      <span>
                        <span className="font-semibold tabular-nums text-white">
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
