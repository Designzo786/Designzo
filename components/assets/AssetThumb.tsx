"use client";

import dynamic from "next/dynamic";
import { ImageOff } from "lucide-react";

// Lottie player is ~80 KB gzipped, so lazy-load it. Pages that never
// render a Lottie thumbnail (e.g. a dashboard with only 3D uploads)
// don't pay the cost.
const LottieCardPreview = dynamic(
  () => import("./LottieCardPreview").then((m) => m.LottieCardPreview),
  {
    loading: () => <div className="absolute inset-0 skeleton" />,
  }
);

/**
 * Sniff Lottie URLs by extension. Lottie uploads on the marketplace reuse
 * the public copy of their `.json` / `.lottie` source as previewKey, so
 * any thumbnail URL ending in those is a Lottie animation we should play
 * inline instead of trying to render through <img>. Strips querystrings
 * so a CDN cache-buster like `?v=123` doesn't trip the check.
 */
function isLottieUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const lower = url.toLowerCase().split("?")[0];
  return lower.endsWith(".json") || lower.endsWith(".lottie");
}

interface Props {
  /** The asset's previewKey URL — image for non-Lottie, Lottie source
   *  URL for Lottie. */
  src: string | undefined | null;
  /** Alt text + accessible label. */
  alt: string;
  /** Optional Tailwind size + radius classes applied to the container.
   *  Default is a generic thumbnail — pass e.g. `w-12 h-12 rounded-lg`
   *  for a table row, `w-full aspect-[4/3] rounded-xl` for a tile. */
  className?: string;
  /** Object-fit for non-Lottie image. Defaults to `cover`. */
  fit?: "cover" | "contain";
}

/**
 * Universal asset thumbnail. Handles three rendering paths:
 *
 *   - URL ending in `.json` / `.lottie` → animated player.
 *   - Any other URL                     → plain <img>.
 *   - No URL                            → muted broken-image icon.
 *
 * Use this anywhere a static thumbnail used to live: dashboard rows,
 * library, wishlist, admin moderation table, checkout summary, search
 * autocomplete. Keeps Lottie cards alive everywhere without each surface
 * having to know about the dotlottie player.
 */
export function AssetThumb({
  src,
  alt,
  className = "w-16 h-16 rounded-lg",
  fit = "cover",
}: Props) {
  if (!src) {
    return (
      <div
        className={`relative bg-canvas ring-1 ring-border flex items-center justify-center text-subtle ${className}`}
      >
        <ImageOff className="w-1/3 h-1/3" />
      </div>
    );
  }

  if (isLottieUrl(src)) {
    return (
      <div
        className={`relative overflow-hidden bg-elevated ring-1 ring-border ${className}`}
      >
        <LottieCardPreview src={src} />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-canvas ring-1 ring-border ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`absolute inset-0 w-full h-full ${
          fit === "contain" ? "object-contain" : "object-cover"
        }`}
      />
    </div>
  );
}
