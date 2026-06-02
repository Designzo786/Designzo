import Link from "next/link";
import {
  Search,
  ShoppingBag,
  Rocket,
  ArrowRight,
  Workflow,
} from "lucide-react";
import { AmbientBackdrop, SectionEyebrow } from "./_shared";

const STEPS = [
  {
    n: "01",
    icon: Search,
    title: "Browse the marketplace",
    description:
      "Search by category, file type, or price. Use the live 3D preview to inspect each asset before you buy.",
  },
  {
    n: "02",
    icon: ShoppingBag,
    title: "Buy with one click",
    description:
      "Secure checkout via Razorpay — UPI, cards, netbanking, and wallets all accepted. Free downloads land in your library instantly.",
  },
  {
    n: "03",
    icon: Rocket,
    title: "Use it in your project",
    description:
      "Download the original files plus a permanent license key. Build, ship, and never worry about attribution again.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-24">
      <AmbientBackdrop tone="sky" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="flex justify-center mb-2">
            <SectionEyebrow icon={Workflow} label="How it works" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            <span className="text-primary">From browse to ship</span>{" "}
            <span className="gradient-text-hero">in 3 steps</span>
          </h2>
          <p className="mt-4 text-base text-secondary leading-relaxed">
            No subscriptions, no credits to top up, no waiting for downloads.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Connecting line — a subtle gradient stroke linking the three
              step icons across the row. Hidden on mobile (column stack). */}
          <div
            aria-hidden
            className="hidden md:block absolute top-14 left-[16.6%] right-[16.6%] h-px bg-linear-to-r from-transparent via-accent/40 to-transparent"
          />

          {STEPS.map(({ n, icon: Icon, title, description }, i) => (
            <div
              key={n}
              className="group relative overflow-hidden rounded-3xl border border-white/5 bg-surface/60 backdrop-blur-sm p-7 transition-all duration-500 hover:-translate-y-1 shadow-[0_30px_60px_-30px_rgba(124,58,237,0.55),inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:shadow-[0_40px_80px_-30px_rgba(124,58,237,0.85),inset_0_1px_0_0_rgba(255,255,255,0.12)]"
            >
              {/* Glass top-edge highlight */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent"
              />
              {/* Grain texture */}
              <span
                aria-hidden
                className="grain-overlay pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
              />

              <div className="relative flex items-center justify-between mb-6">
                {/* Premium icon with bloom */}
                <div className="relative">
                  <span
                    aria-hidden
                    className="absolute -inset-3 rounded-3xl blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 bg-accent/40"
                  />
                  <div className="relative w-14 h-14 rounded-2xl gradient-accent text-white flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(124,58,237,0.55),inset_0_1px_0_0_rgba(255,255,255,0.18)]">
                    <Icon className="w-6 h-6" strokeWidth={1.6} />
                  </div>
                </div>
                {/* Faded step number */}
                <div className="text-4xl font-black text-elevated/80 tabular-nums tracking-tight select-none">
                  {n}
                </div>
              </div>

              <h3 className="relative text-lg font-bold text-primary tracking-tight">
                {title}
              </h3>
              <p className="relative mt-2.5 text-sm text-secondary leading-relaxed">
                {description}
              </p>

              {/* Arrow on hover from step 1 → 2 → 3, hidden on last card */}
              {i < STEPS.length - 1 && (
                <ArrowRight
                  aria-hidden
                  className="hidden md:block absolute top-14 -right-3.5 w-3.5 h-3.5 text-accent-light opacity-0 group-hover:opacity-100 transition-opacity"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            href="/explore"
            className="group inline-flex items-center gap-2 px-6 h-12 rounded-xl text-sm font-semibold text-white gradient-accent shadow-[0_8px_32px_-4px_rgba(124,58,237,0.55),inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:shadow-[0_12px_48px_-4px_rgba(124,58,237,0.75),inset_0_1px_0_0_rgba(255,255,255,0.3)] transition-all"
          >
            Start browsing
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
