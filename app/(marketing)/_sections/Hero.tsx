import Link from "next/link";
import { ArrowRight, Sparkles, Star, Users, Package } from "lucide-react";
import { SearchBar } from "@/components/layout/SearchBar";

export function Hero() {
  return (
    // No `overflow-hidden` on the section itself — the SearchBar dropdown
    // needs to extend below into the next section. The drifting blobs are
    // wrapped in their own bounded container that clips them so they
    // never bleed past the hero. `min-h-[calc(100dvh-4rem)]` fills the
    // viewport below the 4rem navbar; `flex items-center` vertically
    // centres the content.
    <section className="relative min-h-[calc(100dvh-4rem)] flex items-center isolate">
      {/* ─── Backdrop layer 1: drifting violet blobs ─────────────────────
          Wrapped in an overflow-hidden container so they stay inside the
          hero's box. Three large blurred radials drift on independent
          timers; reads as atmosphere, not animation. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 overflow-hidden pointer-events-none"
      >
        <div className="hero-blob-1 absolute top-[15%] left-[20%] w-2xl h-168 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="hero-blob-2 absolute bottom-[10%] right-[15%] w-xl h-144 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="hero-blob-3 absolute top-[40%] left-[55%] w-md h-112 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      {/* ─── Backdrop layer 2: fine grid pattern ────────────────────────
          Adds the "lab notebook" texture that gives the hero its premium
          editorial feel. Masked to a soft elliptical pool so the edges
          fade out instead of hard-cropping. (See .hero-grid in globals.css.) */}
      <div
        aria-hidden
        className="hero-grid absolute inset-0 -z-10 opacity-[0.06]"
      />

      {/* ─── Backdrop layer 3: grain ─────────────────────────────────────
          Tiny noise overlay breaks up the gradients so they don't band
          on cheap monitors. Already declared as a utility in globals.css. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 grain-overlay opacity-[0.12] mix-blend-overlay pointer-events-none"
      />

      <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20">
        <div className="max-w-3xl mx-auto text-center animate-[fade-in_0.8s_ease-out]">
          {/* ─── Premium pill with "live" status dot ───────────────────── */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass border border-border text-[11px] sm:text-xs font-medium text-secondary mb-7 shadow-[0_4px_24px_-12px_rgba(124,58,237,0.5)]">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-accent-light opacity-75 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-accent-light" />
            </span>
            <Sparkles className="w-3.5 h-3.5 text-accent-light" />
            <span className="tracking-wide uppercase">
              Premium 3D Marketplace
            </span>
          </div>

          {/* ─── Headline with under-glow on "3D" ──────────────────────── */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.05]">
            Premium{" "}
            <span className="relative inline-block">
              <span className="gradient-text-hero">3D</span>
              {/* Soft horizontal accent under the word */}
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-2 left-0 right-0 h-px bg-linear-to-r from-transparent via-accent-light to-transparent"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-3 left-1/4 right-1/4 h-4 bg-accent/40 blur-2xl"
              />
            </span>{" "}
            for the web
          </h1>

          <p className="mt-6 text-base sm:text-lg text-secondary max-w-md mx-auto leading-relaxed">
            3D, Lottie, SVG, and materials — crafted by the world&apos;s
            best creators.
          </p>

          {/* ─── Social-proof trust row ───────────────────────────────── */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs sm:text-[13px]">
            <div className="inline-flex items-center gap-1.5 text-muted">
              <Users className="w-3.5 h-3.5 text-accent-light" />
              <span>
                <strong className="text-primary font-semibold">10K+</strong>{" "}
                creators
              </span>
            </div>
            <span aria-hidden className="text-subtle">
              ·
            </span>
            <div className="inline-flex items-center gap-1.5 text-muted">
              <Package className="w-3.5 h-3.5 text-accent-light" />
              <span>
                <strong className="text-primary font-semibold">50K+</strong>{" "}
                assets shipped
              </span>
            </div>
            <span aria-hidden className="text-subtle">
              ·
            </span>
            <div className="inline-flex items-center gap-1.5 text-muted">
              <Star className="w-3.5 h-3.5 fill-gold text-gold" />
              <span>
                <strong className="text-primary font-semibold">4.9</strong>{" "}
                avg rating
              </span>
            </div>
          </div>

          {/* ─── Primary action: search ────────────────────────────────── */}
          <div className="mt-9 sm:mt-10 mx-auto max-w-2xl text-left">
            <SearchBar
              size="lg"
              placeholder="Search 3D models, Lottie animations, SVG icons…"
            />
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="text-secondary font-medium">Try:</span>
              <Link
                href="/explore?category=3d-models"
                className="hover:text-accent-light transition-colors"
              >
                3D Models
              </Link>
              <span className="text-subtle">·</span>
              <Link
                href="/explore?category=3d-icons"
                className="hover:text-accent-light transition-colors"
              >
                3D Icons
              </Link>
              <span className="text-subtle">·</span>
              <Link
                href="/explore?category=lottie"
                className="hover:text-accent-light transition-colors"
              >
                Lottie
              </Link>
              <span className="text-subtle">·</span>
              <Link
                href="/explore?category=svg-icons"
                className="hover:text-accent-light transition-colors"
              >
                SVG Icons
              </Link>
              <span className="text-subtle">·</span>
              <Link
                href="/explore?category=materials"
                className="hover:text-accent-light transition-colors"
              >
                Materials
              </Link>
            </div>
          </div>

          {/* ─── CTA buttons — refined with inner highlight + glow ──── */}
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/explore"
              className="group relative h-12 px-7 rounded-xl text-sm font-semibold text-white gradient-accent flex items-center justify-center gap-2 shadow-[0_8px_32px_-4px_rgba(124,58,237,0.55),inset_0_1px_0_0_rgba(255,255,255,0.18)] hover:shadow-[0_12px_48px_-4px_rgba(124,58,237,0.75),inset_0_1px_0_0_rgba(255,255,255,0.25)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <span className="relative">Explore marketplace</span>
              <ArrowRight className="relative w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/register?type=collaborator"
              className="group relative h-12 px-7 rounded-xl text-sm font-semibold text-primary bg-surface/60 backdrop-blur-sm border border-border-hover flex items-center justify-center gap-2 hover:bg-elevated hover:border-accent/50 hover:-translate-y-0.5 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
            >
              Become a creator
              <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent-light transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
