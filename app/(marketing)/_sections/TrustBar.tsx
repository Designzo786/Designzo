import { ShieldCheck, BadgeCheck, Lock, Zap } from "lucide-react";

// Value propositions that hold true regardless of marketplace size — no
// volume metrics, so the strip never looks empty on a young marketplace.
const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Curated & reviewed",
    description: "Every asset is checked before it goes live.",
  },
  {
    icon: BadgeCheck,
    title: "Royalty-free licenses",
    description: "Use what you buy in any commercial project.",
  },
  {
    icon: Lock,
    title: "Secure checkout",
    description: "Payments processed safely through Razorpay.",
  },
  {
    icon: Zap,
    title: "Instant downloads",
    description: "Files delivered the moment your order completes.",
  },
];

export function TrustBar() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="bg-surface px-6 py-8 text-center hover:bg-elevated transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-elevated border border-border flex items-center justify-center text-accent-light mx-auto">
                <Icon className="w-5 h-5" />
              </div>
              <div className="mt-4 text-sm font-semibold text-primary">
                {item.title}
              </div>
              <div className="mt-1 text-xs text-muted leading-relaxed">
                {item.description}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
