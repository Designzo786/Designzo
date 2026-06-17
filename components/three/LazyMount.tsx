"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
}

/**
 * Mounts `children` only after the wrapper enters the viewport.
 * Once mounted, it stays mounted (avoids GL context churn on scroll).
 */
export function LazyMount({
  children,
  fallback = null,
  rootMargin = "200px",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      // IO unavailable (very old browser / SSR snapshot before hydration) —
      // render children immediately. The cascading render is intentional
      // and one-time.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            obs.disconnect();
            return;
          }
        }
      },
      { rootMargin }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [shown, rootMargin]);

  return (
    <div ref={ref} className="absolute inset-0">
      {shown ? children : fallback}
    </div>
  );
}
