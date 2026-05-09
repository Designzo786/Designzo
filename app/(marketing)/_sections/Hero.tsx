import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";

const Hero3D = dynamic(() => import("@/components/three/Hero3D"), {
  loading: () => <div className="absolute inset-0 skeleton rounded-3xl" />,
});

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* ambient gradient backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 70% 30%, rgba(124,58,237,0.25), transparent 70%), radial-gradient(ellipse 50% 50% at 20% 70%, rgba(168,85,247,0.15), transparent 70%)",
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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-32 lg:pb-40">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Text */}
          <div className="lg:col-span-7 animate-[fade-in_0.8s_ease-out]">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-border text-xs font-medium text-secondary mb-6">
              <Sparkles className="w-3.5 h-3.5 text-accent-light" />
              <span>Premium 3D &amp; 2D Marketplace</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.05]">
              The leading platform
              <br className="hidden sm:block" />
              for{" "}
              <span className="gradient-text-hero">3D &amp; AR</span> on the web
            </h1>

            <p className="mt-6 text-base sm:text-lg text-secondary max-w-xl leading-relaxed">
              Manage, distribute, and monetize 3D assets. Browse thousands of
              premium models, textures, and HDRIs crafted by the world&apos;s
              best creators.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href="/explore"
                className="group h-12 px-6 rounded-xl text-sm font-semibold text-white gradient-accent flex items-center justify-center gap-2 shadow-[0_0_32px_rgba(124,58,237,0.35)] hover:shadow-[0_0_48px_rgba(124,58,237,0.55)] transition-all"
              >
                Explore marketplace
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/register"
                className="h-12 px-6 rounded-xl text-sm font-semibold text-primary bg-elevated border border-border-hover flex items-center justify-center hover:bg-overlay hover:border-accent transition-all"
              >
                Become a creator
              </Link>
            </div>

            <div className="mt-12 flex items-center gap-6 text-xs text-muted">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {["#7c3aed", "#a855f7", "#f59e0b", "#10b981"].map((c) => (
                    <div
                      key={c}
                      className="w-6 h-6 rounded-full border-2 border-canvas"
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <span>Trusted by 500+ creators</span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-gold">★★★★★</span>
                <span>4.9/5 average</span>
              </div>
            </div>
          </div>

          {/* 3D canvas */}
          <div className="lg:col-span-5 animate-[fade-in_1s_ease-out]">
            <div className="relative aspect-square w-full max-w-md mx-auto">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent/30 via-accent-light/15 to-transparent blur-3xl" />
              <div className="relative w-full h-full">
                <Hero3D />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
