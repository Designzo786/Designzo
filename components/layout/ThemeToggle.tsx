"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

/**
 * Sun / moon toggle pinned in the navbar. The actual theme is set on
 * <html data-theme> by the anti-flash inline script in app/layout.tsx —
 * this component just lets the user switch it and writes the choice to
 * localStorage so the next page load remembers.
 *
 * Renders as a 9×9 icon button with the icon for the OPPOSITE theme
 * (clicking a sun jumps to light mode, clicking a moon jumps to dark)
 * which matches the user's mental model of "switch to that".
 */
export function ThemeToggle() {
  // Start undefined so the first paint matches whatever the anti-flash
  // script set — no flicker on mount.
  const [theme, setTheme] = useState<Theme | undefined>(undefined);

  // On mount, read the actual current theme from the document so the
  // icon matches reality.
  // Read the current theme from the document on mount. The setState
  // mirrors the (already-applied) data-theme attribute back into React
  // — intended external-sync, not a cascading-render bug.
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") as
      | Theme
      | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current ?? "dark");
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("dezignxo.theme", next);
    } catch {
      // Storage disabled (Safari private, etc.) — the change still applies
      // for this session; it just won't persist across reloads.
    }
  }

  // Don't render anything until we know the theme — avoids a one-frame
  // flash of the wrong icon on slow networks.
  if (theme === undefined) {
    return <div className="w-9 h-9" aria-hidden />;
  }

  const Icon = theme === "light" ? Moon : Sun;
  const nextLabel = theme === "light" ? "Switch to dark mode" : "Switch to light mode";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={nextLabel}
      title={nextLabel}
      className={cn(
        "relative w-9 h-9 rounded-full flex items-center justify-center",
        "text-muted hover:text-primary hover:bg-elevated transition-colors"
      )}
    >
      <Icon className="w-[18px] h-[18px]" />
    </button>
  );
}
