import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="relative overflow-hidden rounded-3xl border border-border glass-strong p-10 sm:p-16 text-center">
        {/* glow blobs */}
        <div
          aria-hidden
          className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-accent/30 blur-[100px] pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-accent-light/25 blur-[100px] pointer-events-none"
        />

        <div className="relative">
          <div className="inline-block px-3 py-1 rounded-full bg-gold-muted border border-gold/20 text-xs font-medium text-gold mb-5">
            For Creators
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
            Ready to monetize your{" "}
            <span className="gradient-text-gold">creative work</span>?
          </h2>
          <p className="mt-5 text-secondary max-w-xl mx-auto text-base sm:text-lg">
            Join 500+ creators earning passive income on GameChanger. Keep 80%
            of every sale, with weekly bank payouts via RazorpayX.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="group h-12 px-7 rounded-xl text-sm font-semibold text-black gradient-text-gold bg-gold flex items-center justify-center gap-2 shadow-[0_0_36px_rgba(245,158,11,0.35)] hover:shadow-[0_0_48px_rgba(245,158,11,0.55)] transition-all"
            >
              Become a creator
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/docs/creators"
              className="h-12 px-7 rounded-xl text-sm font-semibold text-primary bg-transparent border border-border-hover hover:border-primary flex items-center justify-center transition-all"
            >
              Read the creator guide
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
