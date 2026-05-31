import { Zap, ShieldCheck, Globe2 } from "lucide-react";

const FEATURES = [
  {
    icon: Zap,
    title: "Instant downloads",
    description:
      "Signed URLs deliver files directly from our edge network. No queues, no throttling — your asset is ready the second you click.",
    accent: "from-violet-500/20 to-violet-500/0",
  },
  {
    icon: ShieldCheck,
    title: "Royalty-free, forever",
    description:
      "Every purchase includes a commercial license that doesn't expire. Use assets in unlimited personal and commercial projects.",
    accent: "from-emerald-500/20 to-emerald-500/0",
  },
  {
    icon: Globe2,
    title: "Interactive 3D previews",
    description:
      "See exactly what you're buying. Every 3D asset ships with a real-time WebGL preview — orbit, zoom, and inspect every angle in your browser.",
    accent: "from-cyan-500/20 to-cyan-500/0",
  },
];

export function Features() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="inline-block px-3 py-1 rounded-full bg-accent-muted border border-accent/20 text-xs font-medium text-accent-light mb-4">
          Why Designo
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Built for the way you work
        </h2>
        <p className="mt-3 text-secondary">
          Everything a 3D creator or buyer needs — without the legacy bloat.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 hover:border-border-hover transition-all"
            >
              <div
                aria-hidden
                className={`absolute inset-0 bg-gradient-to-br ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity`}
              />
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-elevated border border-border flex items-center justify-center text-accent-light group-hover:scale-105 group-hover:border-accent/40 transition-all">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-primary">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-secondary leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
