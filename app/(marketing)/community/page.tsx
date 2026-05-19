import Link from "next/link";
import { MessageCircle, Users, Sparkles, Heart, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Community",
  description: "Connect with creators and buyers in the GameChanger community.",
};

const CHANNELS = [
  {
    icon: MessageCircle,
    title: "Discussion",
    description:
      "Share work-in-progress, ask for feedback, and talk shop with other 3D artists.",
  },
  {
    icon: Users,
    title: "Open collaboration",
    description:
      "Follow development, report issues, and suggest features for the platform.",
  },
  {
    icon: Sparkles,
    title: "Tutorials & showcases",
    description:
      "See creator spotlights, workflow breakdowns, and platform walkthroughs.",
  },
];

const GUIDELINES = [
  "Be respectful — critique work, not people.",
  "Only share assets you own or are licensed to share.",
  "Keep self-promotion relevant and occasional.",
  "No harassment, spam, or hateful content.",
];

export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
      <header className="text-center max-w-2xl mx-auto">
        <div className="inline-block px-3 py-1 rounded-full bg-accent-muted border border-accent/20 text-xs font-medium text-accent-light mb-5">
          Community
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-primary">
          Build with other creators
        </h1>
        <p className="mt-4 text-secondary text-base sm:text-lg leading-relaxed">
          GameChanger is more than a marketplace — it&apos;s a place to learn,
          share, and grow alongside other 3D artists and buyers.
        </p>
      </header>

      <section className="mt-14 grid sm:grid-cols-3 gap-5">
        {CHANNELS.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <div className="w-11 h-11 rounded-xl bg-elevated border border-border flex items-center justify-center text-accent-light">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-primary">
                {c.title}
              </h3>
              <p className="mt-1.5 text-sm text-secondary leading-relaxed">
                {c.description}
              </p>
            </div>
          );
        })}
      </section>

      <section className="mt-10 rounded-2xl border border-border bg-surface p-8">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-accent-light" />
          <h2 className="text-xl font-semibold text-primary">
            Community guidelines
          </h2>
        </div>
        <ul className="space-y-2.5">
          {GUIDELINES.map((g) => (
            <li
              key={g}
              className="flex gap-3 text-sm text-secondary leading-relaxed"
            >
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-accent-light shrink-0" />
              {g}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 text-center">
        <p className="text-secondary">
          Ready to contribute? The best way to join in is to start creating.
        </p>
        <Link
          href="/sell"
          className="inline-flex items-center gap-2 mt-4 h-11 px-6 rounded-xl text-sm font-semibold text-white gradient-accent shadow-[0_0_24px_rgba(124,58,237,0.3)] hover:shadow-[0_0_36px_rgba(124,58,237,0.5)] transition-all"
        >
          Become a creator
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
