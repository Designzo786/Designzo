import Link from "next/link";
import { ArrowRight, Boxes, Users, Sparkles } from "lucide-react";

export const metadata = {
  title: "About",
  description: "What Designo is and the mission behind it.",
};

const VALUES = [
  {
    icon: Boxes,
    title: "Quality first",
    description:
      "Every asset is reviewed before it goes live, so buyers get production-ready files they can trust.",
  },
  {
    icon: Users,
    title: "Fair to creators",
    description:
      "Creators keep 80% of every sale, with transparent payouts and no hidden fees.",
  },
  {
    icon: Sparkles,
    title: "Built for the web",
    description:
      "Interactive 3D previews, instant downloads, and a fast, modern marketplace experience.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
      <header className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-primary">
          About Designo
        </h1>
        <p className="mt-4 text-secondary text-base sm:text-lg leading-relaxed">
          Designo is a marketplace for premium 3D and digital assets — a
          place where creators sell their best work and buyers find exactly
          what their next project needs.
        </p>
      </header>

      <section className="mt-14 rounded-2xl border border-border bg-surface p-8">
        <h2 className="text-xl font-semibold text-primary">Our mission</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          3D content powers games, films, product design, and the web — but
          buying and selling it has long been clunky and unfair to the people
          who actually make it. We built Designo to fix that: a clean,
          fast marketplace that treats creators as partners and gives buyers a
          dependable place to source models and materials.
        </p>
        <p className="mt-3 text-secondary leading-relaxed">
          Every asset is human-reviewed, every download is licensed clearly,
          and every sale pays the creator the majority share. Simple.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-primary text-center mb-8">
          What we stand for
        </h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {VALUES.map((v) => {
            const Icon = v.icon;
            return (
              <div
                key={v.title}
                className="rounded-2xl border border-border bg-surface p-6"
              >
                <div className="w-11 h-11 rounded-xl bg-elevated border border-border flex items-center justify-center text-accent-light">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-primary">
                  {v.title}
                </h3>
                <p className="mt-1.5 text-sm text-secondary leading-relaxed">
                  {v.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-14 rounded-2xl border border-border glass-strong p-8 sm:p-12 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-primary">
          Join the marketplace
        </h2>
        <p className="mt-2 text-secondary max-w-md mx-auto">
          Whether you&apos;re here to buy or to sell, getting started takes a
          minute.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/explore"
            className="h-11 px-6 rounded-xl text-sm font-semibold text-white gradient-accent flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(124,58,237,0.3)] hover:shadow-[0_0_36px_rgba(124,58,237,0.5)] transition-all"
          >
            Explore assets
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/sell"
            className="h-11 px-6 rounded-xl text-sm font-semibold text-primary bg-elevated border border-border-hover flex items-center justify-center hover:border-accent transition-all"
          >
            Sell your work
          </Link>
        </div>
      </section>
    </div>
  );
}
