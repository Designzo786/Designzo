import Link from "next/link";
import { ArrowRight, Sparkles, Crown } from "lucide-react";
import { SectionEyebrow } from "./_shared";

export function CTA() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-surface/60 backdrop-blur-md p-10 sm:p-16 text-center shadow-[0_50px_120px_-30px_rgba(124,58,237,0.7),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          {/* Glass top-edge highlight */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent"
          />

          {/* Grain texture */}
          <span
            aria-hidden
            className="grain-overlay pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay"
          />

          {/* Layered glow blobs — left violet, right gold, top sparkle */}
          <div
            aria-hidden
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-accent/35 blur-[120px] pointer-events-none"
          />
          <div
            aria-hidden
            className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gold/25 blur-[120px] pointer-events-none"
          />
          <div
            aria-hidden
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-accent-light/15 blur-[140px] pointer-events-none"
          />

          {/* Decorative floating sparkles in the corners */}
          <Sparkles
            aria-hidden
            className="absolute top-8 right-10 w-5 h-5 text-gold/60 animate-pulse"
            strokeWidth={1.5}
          />
          <Sparkles
            aria-hidden
            className="absolute bottom-12 left-8 w-4 h-4 text-accent-light/50 animate-pulse [animation-delay:1.2s]"
            strokeWidth={1.5}
          />

          <div className="relative">
            <div className="flex justify-center mb-3">
              <SectionEyebrow icon={Crown} label="For Creators" tone="gold" />
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
              <span className="text-primary">Ready to monetize your</span>{" "}
              <span className="gradient-text-gold">creative work</span>?
            </h2>
            <p className="mt-6 text-secondary max-w-xl mx-auto text-base sm:text-lg leading-relaxed">
              Sell your 3D work on Designzo and earn passive income. Keep 80%
              of every sale, with bank payouts straight to your account.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/register?type=collaborator"
                className="group relative h-12 px-7 rounded-xl text-sm font-semibold text-black bg-gold flex items-center justify-center gap-2 shadow-[0_8px_32px_-4px_rgba(245,158,11,0.55),inset_0_1px_0_0_rgba(255,255,255,0.3)] hover:shadow-[0_12px_48px_-4px_rgba(245,158,11,0.85),inset_0_1px_0_0_rgba(255,255,255,0.45)] transition-all hover:-translate-y-0.5"
              >
                Become a creator
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/docs/creators"
                className="h-12 px-7 rounded-xl text-sm font-semibold text-primary bg-canvas/40 backdrop-blur border border-white/10 hover:border-white/30 hover:bg-canvas/60 flex items-center justify-center transition-all"
              >
                Read the creator guide
              </Link>
            </div>

            {/* Tiny trust line under the buttons */}
            <p className="mt-8 text-[11px] text-muted tracking-wide">
              Free to join · No monthly fees · Bank payouts via RazorpayX
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
