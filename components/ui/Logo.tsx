import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  hideText?: boolean;
}

/**
 * The brand mark — same isometric purple cube the browser tab shows
 * (see app/icon.svg). Renders inline so it stays crisp at any size and
 * inherits the soft accent glow on hover. The wordmark "Designzo" sits
 * to the right when `hideText` is false (the default).
 */
export function Logo({ className, hideText = false }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5 group shrink-0",
        className
      )}
    >
      <div className="relative w-8 h-8 transition-transform group-hover:scale-105">
        <svg
          viewBox="0 0 64 64"
          className="w-full h-full drop-shadow-[0_0_12px_rgba(124,58,237,0.45)]"
          aria-hidden
        >
          {/* Dark rounded plate behind the cube — matches the favicon */}
          <rect width="64" height="64" rx="14" fill="#0b0b10" />
          {/* Top face — lightest purple */}
          <path d="M32 12 L52 22 L32 32 L12 22 Z" fill="#c084fc" />
          {/* Left face — darkest purple (shadow side) */}
          <path d="M12 22 L32 32 L32 52 L12 42 Z" fill="#7c3aed" />
          {/* Right face — mid purple */}
          <path d="M52 22 L32 32 L32 52 L52 42 Z" fill="#a855f7" />
        </svg>
        {/* Hover halo — same soft violet glow used on accent buttons */}
        <span className="absolute -inset-1 rounded-xl bg-accent/25 blur-md opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
      </div>
      {!hideText && (
        <span className="text-base font-bold gradient-text-hero tracking-tight">
          Designzo
        </span>
      )}
    </Link>
  );
}
