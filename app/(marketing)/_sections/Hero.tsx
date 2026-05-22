import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-32 lg:pb-40">
        <div className="max-w-3xl mx-auto text-center animate-[fade-in_0.8s_ease-out]">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-border text-xs font-medium text-secondary mb-6">
            <Sparkles className="w-3.5 h-3.5 text-accent-light" />
            <span>Premium 3D Marketplace</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.05]">
            The leading platform
            <br className="hidden sm:block" />
            for{" "}
            <span className="gradient-text-hero">3D &amp; AR</span> on the web
          </h1>

          <p className="mt-6 text-base sm:text-lg text-secondary max-w-xl mx-auto leading-relaxed">
            Manage, distribute, and monetize 3D assets. Browse thousands of
            premium models and materials crafted by the world&apos;s best
            creators.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
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
        </div>
      </div>
    </section>
  );
}
