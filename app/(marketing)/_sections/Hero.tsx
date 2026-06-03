import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { SearchBar } from "@/components/layout/SearchBar";

export function Hero() {
  return (
    // No `overflow-hidden` here — the SearchBar's results dropdown needs to be
    // free to extend below the hero into the next section.
    // `min-h-[calc(100dvh-4rem)]` makes the hero fill the visible viewport
    // below the 4rem navbar, and `flex items-center` vertically centres the
    // content block within whatever space remains after the inner padding.
    <section className="relative min-h-[calc(100dvh-4rem)] flex items-center">
      {/* ambient gradient backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 25%, rgba(124,58,237,0.25), transparent 70%), radial-gradient(ellipse 50% 50% at 50% 80%, rgba(168,85,247,0.15), transparent 70%)",
        }}
      />
      {/* grid pattern */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent)",
        }}
      />

      <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20">
        <div className="max-w-3xl mx-auto text-center animate-[fade-in_0.8s_ease-out]">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-border text-xs font-medium text-secondary mb-6">
            <Sparkles className="w-3.5 h-3.5 text-accent-light" />
            <span>Premium 3D Marketplace</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.05]">
            Premium <span className="gradient-text-hero">3D</span> for the web
          </h1>

          <p className="mt-6 text-base sm:text-lg text-secondary max-w-xl mx-auto leading-relaxed">
            Manage, distribute, and monetize 3D assets. Browse thousands of
            premium models and materials crafted by the world&apos;s best
            creators.
          </p>

          {/* Primary action — search. The SearchBar `lg` variant already
              carries its own accent halo and focus glow, so no extra wrapper
              decoration is needed. `text-left` resets the hero's centred
              alignment for the input + chip row inside. */}
          <div className="mt-10 mx-auto max-w-2xl text-left">
            <SearchBar
              size="lg"
              placeholder="Search 3D models, materials, scenes…"
            />
            {/* Popular-search chips — gives users browsing without intent
                a one-click path in, and makes the search area feel anchored
                rather than floating. */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="text-secondary font-medium">Try:</span>
              <Link
                href="/explore?q=low-poly"
                className="hover:text-accent-light transition-colors"
              >
                low-poly
              </Link>
              <span className="text-subtle">·</span>
              <Link
                href="/explore?q=sci-fi"
                className="hover:text-accent-light transition-colors"
              >
                sci-fi
              </Link>
              <span className="text-subtle">·</span>
              <Link
                href="/explore?q=character"
                className="hover:text-accent-light transition-colors"
              >
                characters
              </Link>
              <span className="text-subtle">·</span>
              <Link
                href="/explore?q=textures"
                className="hover:text-accent-light transition-colors"
              >
                textures
              </Link>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/explore"
              className="group h-12 px-6 rounded-xl text-sm font-semibold text-white gradient-accent flex items-center justify-center gap-2 shadow-[0_0_32px_rgba(124,58,237,0.35)] hover:shadow-[0_0_48px_rgba(124,58,237,0.55)] transition-all"
            >
              Explore marketplace
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/register?type=collaborator"
              className="h-12 px-6 rounded-xl text-sm font-semibold text-primary bg-elevated border border-border-hover flex items-center justify-center hover:bg-overlay hover:border-accent transition-all"
            >
              Become a creator
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
