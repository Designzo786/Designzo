import Link from "next/link";
import { BookOpen, FileText, ArrowRight, LifeBuoy } from "lucide-react";

export const metadata = {
  title: "Documentation",
  description: "Guides and reference for buying and selling on Dezignxo.",
};

const DOCS = [
  {
    icon: BookOpen,
    title: "Creator Guide",
    description:
      "How to prepare, upload, price, and get your assets approved — plus how payouts work.",
    href: "/docs/creators",
  },
  {
    icon: FileText,
    title: "Licensing",
    description:
      "What you can and can't do with the assets you buy, and the licence creators grant.",
    href: "/docs/license",
  },
  {
    icon: LifeBuoy,
    title: "Help Center",
    description:
      "Common questions and support topics for buyers and creators.",
    href: "/help",
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <header className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-primary">
          Documentation
        </h1>
        <p className="mt-4 text-secondary text-base sm:text-lg leading-relaxed">
          Everything you need to know to buy and sell on Dezignxo.
        </p>
      </header>

      <div className="mt-14 grid sm:grid-cols-3 gap-5">
        {DOCS.map((d) => {
          const Icon = d.icon;
          return (
            <Link
              key={d.href}
              href={d.href}
              className="group rounded-2xl border border-border bg-surface p-6 hover:border-accent/40 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-elevated border border-border flex items-center justify-center text-accent-light group-hover:border-accent/40 transition-colors">
                <Icon className="w-5 h-5" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-primary">
                {d.title}
              </h2>
              <p className="mt-1.5 text-sm text-secondary leading-relaxed">
                {d.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent-light">
                Read more
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
