import { Zap, ShieldCheck, Globe2, Star } from "lucide-react";
import { AmbientBackdrop, SectionEyebrow } from "./_shared";

const FEATURES = [
  {
    icon: Zap,
    title: "Instant downloads",
    description:
      "Signed URLs deliver files directly from our edge network. No queues, no throttling — your asset is ready the second you click.",
    iconClass: "text-violet-300 bg-violet-500/15 border-violet-400/30",
    glow:
      "shadow-[0_30px_60px_-30px_rgba(124,58,237,0.55),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
    hoverGlow:
      "group-hover:shadow-[0_40px_80px_-30px_rgba(124,58,237,0.85),inset_0_1px_0_0_rgba(255,255,255,0.12)]",
    ambient: "bg-violet-500/40",
  },
  {
    icon: ShieldCheck,
    title: "Royalty-free, forever",
    description:
      "Every purchase includes a commercial license that doesn't expire. Use assets in unlimited personal and commercial projects.",
    iconClass: "text-emerald-300 bg-emerald-500/15 border-emerald-400/30",
    glow:
      "shadow-[0_30px_60px_-30px_rgba(16,185,129,0.55),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
    hoverGlow:
      "group-hover:shadow-[0_40px_80px_-30px_rgba(16,185,129,0.85),inset_0_1px_0_0_rgba(255,255,255,0.12)]",
    ambient: "bg-emerald-500/40",
  },
  {
    icon: Globe2,
    title: "Interactive 3D previews",
    description:
      "See exactly what you're buying. Every 3D asset ships with a real-time WebGL preview — orbit, zoom, and inspect every angle in your browser.",
    iconClass: "text-sky-300 bg-sky-500/15 border-sky-400/30",
    glow:
      "shadow-[0_30px_60px_-30px_rgba(14,165,233,0.55),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
    hoverGlow:
      "group-hover:shadow-[0_40px_80px_-30px_rgba(14,165,233,0.85),inset_0_1px_0_0_rgba(255,255,255,0.12)]",
    ambient: "bg-sky-500/40",
  },
];

export function Features() {
  return (
    <section className="relative py-24">
      <AmbientBackdrop tone="violet" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="flex justify-center mb-2">
            <SectionEyebrow icon={Star} label="Why Designzo" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            <span className="text-primary">Built for the way</span>{" "}
            <span className="gradient-text-hero">you work</span>
          </h2>
          <p className="mt-4 text-base text-secondary leading-relaxed">
            Everything a 3D creator or buyer needs — without the legacy bloat.
          </p>
        </div>

        <div className="scroll-row scroll-row--wide scroll-row--cols-2 scroll-row--cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`group relative overflow-hidden rounded-3xl border border-white/5 bg-surface/60 backdrop-blur-sm p-7 transition-all duration-500 hover:-translate-y-1 ${f.glow} ${f.hoverGlow}`}
              >
                {/* Glass top-edge highlight */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent"
                />
                {/* Grain texture overlay */}
                <span
                  aria-hidden
                  className="grain-overlay pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
                />

                {/* Double-halo icon */}
                <div className="relative">
                  <span
                    aria-hidden
                    className={`absolute -inset-3 rounded-3xl blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 ${f.ambient}`}
                  />
                  <div
                    className={`relative w-14 h-14 rounded-2xl border flex items-center justify-center backdrop-blur-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] ${f.iconClass}`}
                  >
                    <Icon className="w-6 h-6" strokeWidth={1.6} />
                  </div>
                </div>

                <h3 className="relative mt-6 text-lg font-bold text-primary tracking-tight">
                  {f.title}
                </h3>
                <p className="relative mt-2.5 text-sm text-secondary leading-relaxed">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
