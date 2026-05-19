import Link from "next/link";
import { Search, ShoppingBag, Rocket, ArrowRight } from "lucide-react";

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
    <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      {/* ambient glow */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-72 -z-10 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 60% 100% at 50% 50%, rgba(124,58,237,0.18), transparent 70%)",
        }}
      />

      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="inline-block px-3 py-1 rounded-full bg-accent-muted border border-accent/20 text-xs font-medium text-accent-light mb-4">
          How it works
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          From browse to ship in 3 steps
        </h2>
        <p className="mt-3 text-secondary">
          No subscriptions, no credits to top up, no waiting for downloads.
        </p>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* connecting line (decorative) */}
        <div
          aria-hidden
          className="hidden md:block absolute top-12 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent"
        />

        {STEPS.map(({ n, icon: Icon, title, description }) => (
          <div
            key={n}
            className="relative rounded-2xl border border-border bg-surface p-7 hover:border-border-hover transition-colors"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-xl gradient-accent text-white flex items-center justify-center shadow-[0_0_24px_rgba(124,58,237,0.35)]">
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-3xl font-bold text-elevated">{n}</div>
            </div>
            <h3 className="text-lg font-semibold text-primary">{title}</h3>
            <p className="mt-2 text-sm text-secondary leading-relaxed">
              {description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Link
          href="/explore"
          className="group inline-flex items-center gap-2 px-6 h-12 rounded-xl text-sm font-semibold text-white gradient-accent shadow-[0_0_32px_rgba(124,58,237,0.35)] hover:shadow-[0_0_48px_rgba(124,58,237,0.55)] transition-all"
        >
          Start browsing
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
