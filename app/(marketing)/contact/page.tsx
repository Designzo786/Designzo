import Link from "next/link";
import { Mail, LifeBuoy, Briefcase, ShieldAlert, Clock } from "lucide-react";

export const metadata = {
  title: "Contact",
  description: "Get in touch with the Designzo team.",
};

const CHANNELS = [
  {
    icon: LifeBuoy,
    title: "Support",
    description:
      "Account problems, purchases, downloads, or anything not working as expected.",
    email: "mohdtalha206@gmail.com",
  },
  {
    icon: Briefcase,
    title: "Creators & partnerships",
    description:
      "Questions about selling, payouts, KYC, or partnering with Designzo.",
    email: "mohdtalha206@gmail.com",
  },
  {
    icon: ShieldAlert,
    title: "Trust & safety",
    description:
      "Report a copyright issue, a policy violation, or a security concern.",
    email: "mohdtalha206@gmail.com",
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <header className="text-center max-w-xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-primary">
          Contact us
        </h1>
        <p className="mt-4 text-secondary text-base sm:text-lg leading-relaxed">
          Pick the right inbox below and we&apos;ll get back to you. We&apos;re a
          small team, so please send your message to the most relevant address.
        </p>
      </header>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
        <Clock className="w-3.5 h-3.5" />
        We typically reply within 1-2 business days.
      </div>

      <div className="mt-10 space-y-4">
        {CHANNELS.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.email}
              className="rounded-2xl border border-border bg-surface p-6 flex items-start gap-4"
            >
              <div className="w-11 h-11 rounded-xl bg-elevated border border-border flex items-center justify-center text-accent-light shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-primary">
                  {c.title}
                </h2>
                <p className="mt-1 text-sm text-secondary leading-relaxed">
                  {c.description}
                </p>
                <a
                  href={`mailto:${c.email}`}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent-light hover:text-accent transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {c.email}
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-secondary">
          Looking for quick answers first? The{" "}
          <Link
            href="/help"
            className="text-accent-light hover:text-accent underline underline-offset-2"
          >
            Help Center
          </Link>{" "}
          covers the most common questions.
        </p>
      </div>
    </div>
  );
}
