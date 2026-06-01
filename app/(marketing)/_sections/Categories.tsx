import Link from "next/link";
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

/**
 * Five hero category tiles + one AI Suite call-out, designed to sit right
 * under the Hero. Each card uses a layered visual stack for a premium feel:
 *
 *   ① outer ring with a soft drop-shadow that matches the swatch hue
 *   ② radial + linear gradient backdrop tuned per category
 *   ③ subtle SVG grain overlay so dark cards don't look flat
 *   ④ top-edge highlight stroke (glass effect)
 *   ⑤ double-halo icon (small inner ring + large blurred bloom)
 *   ⑥ animated arrow CTA that slides on hover
 *
 * The AI Suite tile is special: no asset count (it's a tool, not a
 * category), a pulsing NEW badge, and a "Try it now" CTA instead of a count.
 */
const CARDS = [
  {
    slug: "3d-models",
    name: "3D Models",
    tagline: "Premium 3D models, characters and props in glTF + GLB.",
    icon: Box,
    tone: {
      // single source of truth — drives every tinted element on the card
      ring: "border-violet-400/30",
      glow: "shadow-[0_30px_80px_-30px_rgba(124,58,237,0.55),inset_0_1px_0_0_rgba(255,255,255,0.08)]",
      hoverGlow:
        "group-hover:shadow-[0_40px_100px_-30px_rgba(124,58,237,0.85),inset_0_1px_0_0_rgba(255,255,255,0.14)]",
      gradient:
        "bg-[radial-gradient(120%_80%_at_0%_0%,rgba(167,139,250,0.32),transparent_60%),radial-gradient(80%_60%_at_100%_100%,rgba(124,58,237,0.18),transparent_60%),linear-gradient(160deg,rgba(124,58,237,0.12),rgba(11,11,16,0.85))]",
      iconColor: "text-violet-200",
      iconBloom: "bg-violet-500/40",
      iconRing: "border-violet-400/40",
    },
    href: "/explore?category=3d-models",
    countable: true,
    badge: null,
  },
  {
    slug: "3d-icons",
    name: "3D Icons",
    tagline: "Royalty-free 3D icons in PNG + glTF, ready for any product.",
    icon: Hexagon,
    tone: {
      ring: "border-sky-400/30",
      glow: "shadow-[0_30px_80px_-30px_rgba(14,165,233,0.55),inset_0_1px_0_0_rgba(255,255,255,0.08)]",
      hoverGlow:
        "group-hover:shadow-[0_40px_100px_-30px_rgba(14,165,233,0.85),inset_0_1px_0_0_rgba(255,255,255,0.14)]",
      gradient:
        "bg-[radial-gradient(120%_80%_at_0%_0%,rgba(125,211,252,0.32),transparent_60%),radial-gradient(80%_60%_at_100%_100%,rgba(14,165,233,0.18),transparent_60%),linear-gradient(160deg,rgba(14,165,233,0.12),rgba(11,11,16,0.85))]",
      iconColor: "text-sky-200",
      iconBloom: "bg-sky-500/40",
      iconRing: "border-sky-400/40",
    },
    href: "/explore?category=3d-icons",
    countable: true,
    badge: null,
  },
  {
    slug: "lottie",
    name: "Lottie Animations",
    tagline: "Lightweight JSON animations for web & app micro-interactions.",
    icon: Sparkles,
    tone: {
      ring: "border-pink-400/30",
      glow: "shadow-[0_30px_80px_-30px_rgba(236,72,153,0.55),inset_0_1px_0_0_rgba(255,255,255,0.08)]",
      hoverGlow:
        "group-hover:shadow-[0_40px_100px_-30px_rgba(236,72,153,0.85),inset_0_1px_0_0_rgba(255,255,255,0.14)]",
      gradient:
        "bg-[radial-gradient(120%_80%_at_0%_0%,rgba(249,168,212,0.32),transparent_60%),radial-gradient(80%_60%_at_100%_100%,rgba(236,72,153,0.18),transparent_60%),linear-gradient(160deg,rgba(236,72,153,0.12),rgba(11,11,16,0.85))]",
      iconColor: "text-pink-200",
      iconBloom: "bg-pink-500/40",
      iconRing: "border-pink-400/40",
    },
    href: "/explore?category=lottie",
    countable: true,
    badge: null,
  },
  {
    slug: "svg-icons",
    name: "SVG Icons",
    tagline: "Scalable SVG icons in every style — outline, filled, duotone.",
    icon: Layers,
    tone: {
      ring: "border-emerald-400/30",
      glow: "shadow-[0_30px_80px_-30px_rgba(16,185,129,0.55),inset_0_1px_0_0_rgba(255,255,255,0.08)]",
      hoverGlow:
        "group-hover:shadow-[0_40px_100px_-30px_rgba(16,185,129,0.85),inset_0_1px_0_0_rgba(255,255,255,0.14)]",
      gradient:
        "bg-[radial-gradient(120%_80%_at_0%_0%,rgba(110,231,183,0.32),transparent_60%),radial-gradient(80%_60%_at_100%_100%,rgba(16,185,129,0.18),transparent_60%),linear-gradient(160deg,rgba(16,185,129,0.12),rgba(11,11,16,0.85))]",
      iconColor: "text-emerald-200",
      iconBloom: "bg-emerald-500/40",
      iconRing: "border-emerald-400/40",
    },
    href: "/explore?category=svg-icons",
    countable: true,
    badge: null,
  },
  {
    slug: "ai-suite",
    name: "AI Suite",
    tagline: "Generate 3D models and animations from a single prompt.",
    icon: Wand2,
    tone: {
      ring: "border-accent/40",
      glow: "shadow-[0_30px_80px_-30px_rgba(124,58,237,0.7),inset_0_1px_0_0_rgba(255,255,255,0.1)]",
      hoverGlow:
        "group-hover:shadow-[0_50px_120px_-30px_rgba(124,58,237,1),inset_0_1px_0_0_rgba(255,255,255,0.18)]",
      gradient:
        "bg-[radial-gradient(120%_80%_at_0%_0%,rgba(196,181,253,0.4),transparent_60%),radial-gradient(80%_60%_at_100%_100%,rgba(124,58,237,0.25),transparent_60%),linear-gradient(160deg,rgba(124,58,237,0.2),rgba(11,11,16,0.85))]",
      iconColor: "text-accent-light",
      iconBloom: "bg-accent/50",
      iconRing: "border-accent/50",
    },
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
  ["home-category-counts-v3"],
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
    // pt-0 so it sits flush under the Hero (which has its own pb), pb stays
    // generous to breathe before the TrustBar.
    <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-0 pb-24">
      {/* Section heading — slightly larger than other section headers
          because this is the marquee tile row right under Hero. */}
      <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            <span className="text-primary">One marketplace,</span>{" "}
            <span className="gradient-text-hero">every visual asset</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-secondary leading-relaxed max-w-xl">
            From production-ready 3D models and Lottie animations to SVG icons
            and AI-generated assets — Designzo has the visuals every product
            team needs, under one royalty-free license.
          </p>
        </div>
        <Link
          href="/explore"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-accent-light hover:text-accent transition-colors group"
        >
          Browse all assets
          <ArrowUpRight className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-5">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const count = card.countable ? counts[card.slug] ?? 0 : null;
          return (
            <Link
              key={card.slug}
              href={card.href}
              className={`relative group overflow-hidden rounded-3xl border ${card.tone.ring} ${card.tone.gradient} ${card.tone.glow} ${card.tone.hoverGlow} p-6 flex flex-col gap-5 transition-all duration-500 hover:-translate-y-1 hover:border-opacity-80`}
            >
              {/* Inner top-edge highlight — gives the card a glassy lit edge */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent"
              />

              {/* Subtle SVG grain overlay (utility class in globals.css) so
                  the gradient doesn't read flat on retina — barely-there
                  texture, mix-blend-overlay at low opacity. */}
              <span
                aria-hidden
                className="grain-overlay pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
              />

              {/* NEW pill on the AI Suite card — pulse animation hints
                  at the freshness of the feature without being noisy */}
              {card.badge && (
                <span className="absolute top-4 right-4 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-accent-light bg-canvas/70 backdrop-blur border border-accent/40 shadow-[0_0_16px_-2px_rgba(124,58,237,0.7)]">
                  <span className="w-1 h-1 rounded-full bg-accent-light animate-pulse" />
                  {card.badge}
                </span>
              )}

              {/* Double-halo icon — large blurred bloom behind a crisp
                  bordered chip in front. The bloom intensifies on hover. */}
              <div className="relative">
                <span
                  aria-hidden
                  className={`absolute -inset-4 rounded-3xl blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 ${card.tone.iconBloom}`}
                />
                <div
                  className={`relative w-16 h-16 rounded-2xl bg-canvas/60 border ${card.tone.iconRing} flex items-center justify-center backdrop-blur-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]`}
                >
                  <Icon
                    className={`w-8 h-8 ${card.tone.iconColor}`}
                    strokeWidth={1.6}
                  />
                </div>
              </div>

              {/* Card body */}
              <div className="relative flex-1 min-w-0">
                <h3 className="text-lg font-bold text-primary tracking-tight">
                  {card.name}
                </h3>
                <p className="text-[13px] text-secondary leading-relaxed mt-2 line-clamp-3">
                  {card.tagline}
                </p>
              </div>

              {/* Footer — bigger count typography for a premium feel */}
              <div className="relative flex items-end justify-between mt-1">
                {count !== null ? (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-primary tabular-nums tracking-tight">
                      {formatCount(count)}
                    </span>
                    <span className="text-[11px] text-muted">
                      {count === 1 ? "asset" : "assets"}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-accent-light">
                    Try it now
                  </span>
                )}
                <span className="w-9 h-9 rounded-full border border-white/10 bg-canvas/40 backdrop-blur flex items-center justify-center text-muted group-hover:text-primary group-hover:bg-white/10 group-hover:border-white/25 transition-all">
                  <ArrowUpRight className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Mobile-only "Browse all" link below the grid */}
      <div className="sm:hidden mt-6 text-center">
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
