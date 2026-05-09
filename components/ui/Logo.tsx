import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  hideText?: boolean;
}

export function Logo({ className, hideText = false }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5 group shrink-0",
        className
      )}
    >
      <div className="relative w-8 h-8 rounded-lg gradient-accent flex items-center justify-center transition-transform group-hover:scale-105 shadow-[0_0_20px_rgba(124,58,237,0.4)]">
        <span className="text-white font-bold text-base leading-none">G</span>
        <span className="absolute -inset-1 rounded-xl bg-accent/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
      </div>
      {!hideText && (
        <span className="text-base font-bold gradient-text-hero tracking-tight">
          GameChanger
        </span>
      )}
    </Link>
  );
}
