import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared visual primitives for marketing-page sections so the whole home
 * page reads as one premium surface — same eyebrow style, same ambient
 * lighting language, same heading flourish.
 *
 * Drop these into each section instead of re-rolling decorative code.
 */

interface AmbientBackdropProps {
  /** Visual tone — picks the glow colour palette. */
  tone?: "violet" | "pink" | "sky" | "gold" | "mixed";
  className?: string;
}

/**
 * Three large, heavily-blurred glow blobs that drift behind a section.
 * Absolute-positioned, pointer-events-none, sits at -z-10. Tone tunes the
 * palette so different sections feel related but not identical.
 */
export function AmbientBackdrop({
  tone = "violet",
  className,
}: AmbientBackdropProps) {
  const palette = {
    violet: ["bg-accent/15", "bg-pink-500/10", "bg-sky-500/8"],
    pink: ["bg-pink-500/15", "bg-accent/10", "bg-amber-500/8"],
    sky: ["bg-sky-500/15", "bg-accent/10", "bg-emerald-500/8"],
    gold: ["bg-gold/12", "bg-accent/10", "bg-pink-500/8"],
    mixed: ["bg-accent/12", "bg-emerald-500/10", "bg-pink-500/10"],
  }[tone];

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden -z-10",
        className
      )}
    >
      <div
        className={cn(
          "absolute top-10 -left-32 w-[480px] h-[480px] rounded-full blur-[120px]",
          palette[0]
        )}
      />
      <div
        className={cn(
          "absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full blur-[120px]",
          palette[1]
        )}
      />
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-[140px]",
          palette[2]
        )}
      />
    </div>
  );
}

interface SectionEyebrowProps {
  icon: LucideIcon;
  label: string;
  /** Optional trailing text — e.g. "1,240 results" or "Updated daily". */
  meta?: string;
  /** Visual tone — accent / gold / emerald. */
  tone?: "accent" | "gold" | "emerald";
}

/**
 * The small uppercase pill that sits above every section's heading. Gives
 * the whole home page a consistent typographic rhythm — visitors immediately
 * recognise "this is a new section" without reading the heading.
 */
export function SectionEyebrow({
  icon: Icon,
  label,
  meta,
  tone = "accent",
}: SectionEyebrowProps) {
  const styles = {
    accent: {
      bg: "bg-accent-muted/60",
      border: "border-accent/25",
      text: "text-accent-light",
      glow: "shadow-[0_0_24px_-6px_rgba(124,58,237,0.5)]",
    },
    gold: {
      bg: "bg-gold-muted/60",
      border: "border-gold/25",
      text: "text-gold",
      glow: "shadow-[0_0_24px_-6px_rgba(217,165,32,0.5)]",
    },
    emerald: {
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/25",
      text: "text-emerald-300",
      glow: "shadow-[0_0_24px_-6px_rgba(16,185,129,0.5)]",
    },
  }[tone];

  return (
    <div className="flex items-center gap-2 mb-5">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm",
          "border",
          styles.bg,
          styles.border,
          styles.text,
          styles.glow
        )}
      >
        <Icon className="w-3 h-3" />
        {label}
      </span>
      {meta && (
        <span className="text-[11px] text-muted font-medium tabular-nums">
          {meta}
        </span>
      )}
    </div>
  );
}
