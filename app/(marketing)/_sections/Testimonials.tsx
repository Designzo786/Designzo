import { Star, Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    quote:
      "I uploaded 30 assets in my first month and made enough to cover my rent. The 80/20 split is genuinely industry-leading.",
    name: "Mira Tanaka",
    role: "3D Character Artist",
    initials: "MT",
    color: "from-violet-500 to-purple-500",
    rating: 5,
  },
  {
    quote:
      "The interactive 3D preview is the killer feature. I've stopped buying from sites that show static thumbnails — I need to see topology before I commit.",
    name: "James Chen",
    role: "Indie Game Developer",
    initials: "JC",
    color: "from-fuchsia-500 to-pink-500",
    rating: 5,
  },
  {
    quote:
      "Files come in the formats I actually use — not buried in some proprietary archive. Download once, drop straight into Blender. That's it.",
    name: "Sofia Reyes",
    role: "Senior 3D Generalist",
    initials: "SR",
    color: "from-amber-500 to-orange-500",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="inline-block px-3 py-1 rounded-full bg-gold-muted border border-gold/20 text-xs font-medium text-gold mb-4">
          Loved by creators
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Don&apos;t just take our word for it
        </h2>
        <p className="mt-3 text-secondary">
          Real feedback from creators and developers shipping with GameChanger.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t) => (
          <figure
            key={t.name}
            className="relative rounded-2xl border border-border bg-surface p-7 flex flex-col"
          >
            <Quote
              aria-hidden
              className="absolute top-5 right-5 w-7 h-7 text-elevated"
            />

            <div className="flex items-center gap-0.5 mb-4">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-gold text-gold" />
              ))}
            </div>

            <blockquote className="text-sm text-primary leading-relaxed flex-1">
              &ldquo;{t.quote}&rdquo;
            </blockquote>

            <figcaption className="mt-6 pt-5 border-t border-border flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}
              >
                {t.initials}
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
    </section>
  );
}
