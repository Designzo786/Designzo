"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

interface Props {
  src: string;
  alt: string;
  /** Tailwind classes for the <img> itself — caller controls size /
   *  positioning / object-fit / hover scale. */
  className?: string;
  /** Native lazy attr. Defaults to lazy so home-page rails don't
   *  request every preview eagerly on first paint. */
  loading?: "lazy" | "eager";
  /** Native decoding attr. `async` lets the browser decode off the
   *  main thread so a heavy PNG doesn't jank the home-page scroll. */
  decoding?: "async" | "sync" | "auto";
}

/**
 * <img> with a shimmer-skeleton overlay until it's actually loaded.
 *
 * Why this exists:
 *   Asset preview PNGs ship from R2 — first-paint can take 300–800 ms
 *   on a cold CDN edge for a wide home-page rail. Without a loader the
 *   reader sees an empty `bg-elevated` rectangle that looks like the
 *   card is broken. The shimmer signals "this is loading, not broken"
 *   and disappears the instant the bitmap is on screen.
 *
 * Render paths:
 *   - Image still decoding → skeleton overlay covers the whole tile.
 *   - Image loaded         → skeleton fades out, <img> stays at full
 *                            opacity.
 *   - Image errored (404)  → skeleton replaced by a muted broken-
 *                            image icon so the card doesn't claim it
 *                            has a preview that didn't actually load.
 *
 * The wrapper is `position: relative` already by the time this renders
 * — the caller's parent (.relative aspect-* overflow-hidden) provides
 * the positioning context. We only render the image + overlay.
 */
export function AssetCardImage({
  src,
  alt,
  className,
  loading = "lazy",
  decoding = "async",
}: Props) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  );

  if (status === "error") {
    // Don't render the broken <img> — it would show the browser's
    // ugly default icon. The muted ImageOff matches the empty-state
    // visual the rest of the marketplace uses.
    return (
      <div className="absolute inset-0 flex items-center justify-center text-muted/40 bg-elevated">
        <ImageOff className="w-1/4 h-1/4" />
      </div>
    );
  }

  return (
    <>
      {/* Skeleton sits BEHIND the <img>. When the bitmap decodes the
          img fades in from opacity-0 → opacity-100 and the skeleton
          is naturally covered. Using opacity (not display) on the
          img keeps layout stable — the skeleton's geometry matches
          the bitmap's geometry exactly. */}
      {status === "loading" && (
        <div
          aria-hidden
          className="absolute inset-0 skeleton"
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding={decoding}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        className={`${className ?? ""} ${
          status === "loaded" ? "opacity-100" : "opacity-0"
        } transition-opacity duration-300`}
      />
    </>
  );
}
