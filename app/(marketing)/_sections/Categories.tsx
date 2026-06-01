import Link from "next/link";
import { unstable_cache } from "next/cache";
import {
  Box,
  Sparkles,
  Layers,
  PenTool,
  Hexagon,
  Wand2,
  ArrowUpRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

/**
 * 6 rich category cards (5 asset categories + the AI Suite tool).
 *
 * Each card carries:
 *   • a unique gradient swatch (so the row reads as a rainbow at a glance)
 *   • a Lucide icon hero that mirrors the card's brand tint
 *   • a count of approved assets pulled live from the DB on a 60s ISR window
 *   • a tagline that matches the marketplace's value prop for that category
 *
 * The AI Suite card is special: it has no DB count (it's a tool, not a
 * category) and gets a "NEW" pill in the corner. Lives on /ai-generate.
 *
 * Layout: 1 column on phones, 2 on tablets, 3 on laptops, 6 on wide
 * desktops — a clean "wide rainbow" on hero monitors that gracefully
 * degrades on small screens.
 */
const CARDS = [
  {
    slug: "3d-models",
    name: "3D Models",
    tagline: "Premium 3D models, characters and props in glTF + GLB.",
    icon: Box,
    iconClass: "text-violet-300",
    gradient:
      "bg-[radial-gradient(circle_at_30%_20%,rgba(167,139,250,0.35),transparent_60%),linear-gradient(135deg,rgba(124,58,237,0.18),rgba(15,15,22,0.5))]",
    border: "border-violet-400/25",
    glow: "shadow-[0_30px_60px_-30px_rgba(124,58,237,0.55)]",
    href: "/explore?category=3d-models",
    countable: true,
    badge: null,
  },
  {
    slug: "3d-icons",
    name: "3D Icons",
    tagline: "Royalty-free 3D icons in PNG + glTF, ready for any product.",
    icon: Hexagon,
    iconClass: "text-sky-300",
    gradient:
      "bg-[radial-gradient(circle_at_30%_20%,rgba(125,211,252,0.32),transparent_60%),linear-gradient(135deg,rgba(14,165,233,0.15),rgba(15,15,22,0.5))]",
    border: "border-sky-400/25",
    glow: "shadow-[0_30px_60px_-30px_rgba(14,165,233,0.5)]",
    href: "/explore?category=3d-icons",
    countable: true,
    badge: null,
  },
  {
    slug: "lottie",
    name: "Lottie Animations",
    tagline: "Lightweight JSON animations for web & app micro-interactions.",
    icon: Sparkles,
    iconClass: "text-pink-300",
    gradient:
      "bg-[radial-gradient(circle_at_30%_20%,rgba(249,168,212,0.32),transparent_60%),linear-gradient(135deg,rgba(236,72,153,0.15),rgba(15,15,22,0.5))]",
    border: "border-pink-400/25",
    glow: "shadow-[0_30px_60px_-30px_rgba(236,72,153,0.5)]",
    href: "/explore?category=lottie",
    countable: true,
    badge: null,
  },
  {
    slug: "vector-illustrations",
    name: "Vector Illustrations",
    tagline: "Editable, royalty-free SVG illustrations for marketing pages.",
    icon: PenTool,
    iconClass: "text-amber-300",
    gradient:
      "bg-[radial-gradient(circle_at_30%_20%,rgba(252,211,77,0.32),transparent_60%),linear-gradient(135deg,rgba(245,158,11,0.15),rgba(15,15,22,0.5))]",
    border: "border-amber-400/25",
    glow: "shadow-[0_30px_60px_-30px_rgba(245,158,11,0.5)]",
    href: "/explore?category=vector-illustrations",
    countable: true,
    badge: null,
  },
  {
    slug: "svg-icons",
    name: "SVG Icons",
    tagline: "Scalable SVG icons in every style — outline, filled, duotone.",
    icon: Layers,
    iconClass: "text-emerald-300",
    gradient:
      "bg-[radial-gradient(circle_at_30%_20%,rgba(110,231,183,0.32),transparent_60%),linear-gradient(135deg,rgba(16,185,129,0.15),rgba(15,15,22,0.5))]",
    border: "border-emerald-400/25",
    glow: "shadow-[0_30px_60px_-30px_rgba(16,185,129,0.5)]",
    href: "/explore?category=svg-icons",
    countable: true,
    badge: null,
  },
  {
    slug: "ai-suite",
    name: "AI Suite",
    tagline: "Generate 3D models and animations from a single prompt.",
    icon: Wand2,
    iconClass: "text-accent-light",
    gradient:
      "bg-[radial-gradient(circle_at_30%_20%,rgba(196,181,253,0.4),transparent_60%),linear-gradient(135deg,rgba(124,58,237,0.25),rgba(15,15,22,0.5))]",
    border: "border-accent/35",
    glow: "shadow-[0_30px_60px_-30px_rgba(124,58,237,0.65)]",
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
  ["home-category-counts-v2"],
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
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">
            One marketplace, every visual asset
          </h2>
          <p className="mt-3 text-sm sm:text-base text-secondary leading-relaxed">
            From production-ready 3D models and Lottie animations to SVG icons
            and AI-generated assets — Designzo has the visuals every product
            team needs, under one royalty-free license.
          </p>
        </div>
        <Link
          href="/explore"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-accent-light hover:text-accent transition-colors"
        >
          Browse all assets
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const count = card.countable ? counts[card.slug] ?? 0 : null;
          return (
            <Link
              key={card.slug}
              href={card.href}
              className={`relative group rounded-2xl border ${card.border} ${card.gradient} ${card.glow} p-5 overflow-hidden flex flex-col gap-4 transition-all hover:scale-[1.02] hover:border-opacity-60`}
            >
              {/* NEW badge — top right, only on the AI Suite card */}
              {card.badge && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-accent-light bg-accent-muted border border-accent/30 shadow-[0_0_12px_-2px_rgba(124,58,237,0.6)]">
                  {card.badge}
                </span>
              )}

              {/* Hero icon — variant-tinted, large, glow halo behind */}
              <div className="relative w-14 h-14 rounded-2xl bg-canvas/40 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                <Icon className={`w-7 h-7 ${card.iconClass}`} strokeWidth={1.8} />
                <span
                  aria-hidden
                  className={`absolute -inset-2 rounded-3xl blur-xl opacity-40 group-hover:opacity-80 transition-opacity ${card.iconClass.replace(
                    "text-",
                    "bg-"
                  )}`}
                />
              </div>

              {/* Card body */}
              <div className="relative flex-1 min-w-0">
                <h3 className="text-base font-bold text-primary tracking-tight">
                  {card.name}
                </h3>
                <p className="text-xs text-secondary leading-relaxed mt-1.5 line-clamp-3">
                  {card.tagline}
                </p>
              </div>

              {/* Footer — count + arrow */}
              <div className="relative flex items-center justify-between text-xs">
                {count !== null ? (
                  <span className="font-semibold text-primary">
                    {formatCount(count)}{" "}
                    <span className="text-muted font-normal">
                      {count === 1 ? "asset" : "assets"}
                    </span>
                  </span>
                ) : (
                  <span className="font-semibold text-accent-light">
                    Try it now
                  </span>
                )}
                <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Mobile-only "Browse all" link below the grid */}
      <div className="sm:hidden mt-5 text-center">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-light hover:text-accent transition-colors"
        >
          Browse all assets
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
