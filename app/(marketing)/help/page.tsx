import Link from "next/link";
import {
  Rocket,
  Upload,
  FileText,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  LifeBuoy,
} from "lucide-react";

export const metadata = {
  title: "Help Center",
  description: "Guides and answers for buying and selling on Dezignxo.",
};

const TOPICS = [
  {
    icon: Rocket,
    title: "Getting started",
    description:
      "Create an account, browse the marketplace, and make your first purchase.",
    href: "/explore",
    cta: "Browse the marketplace",
  },
  {
    icon: Upload,
    title: "Selling assets",
    description:
      "Become a Collaborator, upload your work, and pass the review process.",
    href: "/docs/creators",
    cta: "Read the creator guide",
  },
  {
    icon: FileText,
    title: "Licensing",
    description:
      "Understand what you can and can't do with the assets you buy.",
    href: "/docs/license",
    cta: "View licensing terms",
  },
  {
    icon: CreditCard,
    title: "Payments & payouts",
    description:
      "How checkout works, and how creators withdraw earnings via RazorpayX.",
    href: "/docs/creators",
    cta: "Learn about payouts",
  },
  {
    icon: ShieldCheck,
    title: "Account & security",
    description:
      "Manage your profile, password, and KYC verification details.",
    href: "/dashboard/profile",
    cta: "Go to your profile",
  },
  {
    icon: LifeBuoy,
    title: "Still stuck?",
    description:
      "Can't find what you need? Our support team is one message away.",
    href: "/contact",
    cta: "Contact support",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <header className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-primary">
          Help Center
        </h1>
        <p className="mt-4 text-secondary text-base sm:text-lg leading-relaxed">
          Find guides, answers, and support for everything on Dezignxo.
        </p>
      </header>

      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {TOPICS.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.title}
              href={t.href}
              className="group rounded-2xl border border-border bg-surface p-6 hover:border-accent/40 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-elevated border border-border flex items-center justify-center text-accent-light group-hover:border-accent/40 transition-colors">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-primary">
                {t.title}
              </h3>
              <p className="mt-1.5 text-sm text-secondary leading-relaxed">
                {t.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent-light">
                {t.cta}
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
