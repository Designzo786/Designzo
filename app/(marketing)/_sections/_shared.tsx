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
  /**
   * Kept on the props purely so existing call sites still compile.
   * Per-section backdrops were the reason the home page felt "chunky"
   * (each section restarted its own glow). The whole page now sits on
   * a single continuous ambient field declared once on the marketing
   * layout, so this component is intentionally a no-op.
   */
  tone?: "violet" | "pink" | "sky" | "gold" | "mixed";
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AmbientBackdrop(_: AmbientBackdropProps) {
  return null;
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
