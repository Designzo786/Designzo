import { Star, Quote, MessageCircle } from "lucide-react";
import { AmbientBackdrop, SectionEyebrow } from "./_shared";

const TESTIMONIALS = [
  {
    quote:
      "I uploaded 30 assets in my first month and made enough to cover my rent. The 80/20 split is genuinely industry-leading.",
    name: "Mira Tanaka",
    role: "3D Character Artist",
    initials: "MT",
    color: "from-violet-500 to-purple-500",
    glow: "shadow-[0_30px_60px_-30px_rgba(124,58,237,0.5)]",
    rating: 5,
  },
  {
    quote:
      "The interactive 3D preview is the killer feature. I've stopped buying from sites that show static thumbnails — I need to see topology before I commit.",
    name: "James Chen",
    role: "Indie Game Developer",
    initials: "JC",
    color: "from-fuchsia-500 to-pink-500",
    glow: "shadow-[0_30px_60px_-30px_rgba(236,72,153,0.5)]",
    rating: 5,
  },
  {
    quote:
      "Files come in the formats I actually use — not buried in some proprietary archive. Download once, drop straight into Blender. That's it.",
    name: "Sofia Reyes",
    role: "Senior 3D Generalist",
    initials: "SR",
    color: "from-amber-500 to-orange-500",
    glow: "shadow-[0_30px_60px_-30px_rgba(245,158,11,0.5)]",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="relative py-10 sm:py-16">
      <AmbientBackdrop tone="gold" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="flex justify-center mb-2">
            <SectionEyebrow
              icon={MessageCircle}
              label="Loved by creators"
              tone="gold"
            />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            <span className="text-primary">Don&apos;t just take</span>{" "}
            <span className="gradient-text-hero">our word for it</span>
          </h2>
          <p className="mt-4 text-base text-secondary leading-relaxed">
            Real feedback from creators and developers shipping with Designzo.
          </p>
        </div>

        <div className="scroll-row scroll-row--wide scroll-row--cols-3-at-md">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className={`group relative overflow-hidden rounded-3xl border border-white/5 bg-surface/60 backdrop-blur-sm p-7 flex flex-col transition-all duration-500 hover:-translate-y-1 ${t.glow} hover:shadow-[0_40px_80px_-30px_rgba(124,58,237,0.7)]`}
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

              {/* Massive ghostly quote mark behind the content */}
              <Quote
                aria-hidden
                className="absolute -top-2 -right-2 w-24 h-24 text-elevated/40 rotate-180"
                strokeWidth={1}
              />

              <div className="relative flex items-center gap-0.5 mb-5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-gold text-gold drop-shadow-[0_0_6px_rgba(217,165,32,0.4)]"
                  />
                ))}
              </div>

              <blockquote className="relative text-sm sm:text-[15px] text-primary leading-relaxed flex-1">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              <figcaption className="relative mt-6 pt-5 border-t border-white/10 flex items-center gap-3">
                <div
                  className={`relative w-11 h-11 rounded-full bg-linear-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)]`}
                >
                  {/* Avatar bloom */}
                  <span
                    aria-hidden
                    className={`absolute -inset-1 rounded-full blur-lg opacity-50 bg-linear-to-br ${t.color}`}
                  />
                  <span className="relative">{t.initials}</span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-primary truncate">
                    {t.name}
                  </div>
                  <div className="text-xs text-muted truncate">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
