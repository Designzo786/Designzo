"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

/**
 * Lottie thumbnail used inside AssetCard for Lottie uploads that don't ship
 * a still preview image. The card maps the asset's previewKey URL — which
 * points at the public copy of the .json or .lottie file in R2 — directly
 * into this player, so listing rails play the actual animation as the
 * "thumbnail".
 *
 * Hover behaviour:
 *   - Plays continuously regardless of hover so a paused frame on long
 *     scroll feels less janky. dotlottie-react respects prefers-reduced-
 *     motion at the OS level, so users who've opted out see a still frame.
 *   - speed 1.0 is intentional — slowing it down would change the
 *     creator's animation timing, which is part of what they're selling.
 *
 * Why this is a separate file from the detail-page LottiePlayer:
 *   The detail-page player has its own padding + flex centering tuned for
 *   the larger viewer surface. The card variant fills the entire 4:3
 *   thumbnail area with the animation, no padding, so cards in a rail
 *   read as a single solid grid.
 */
export function LottieCardPreview({ src }: { src: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 transition-transform duration-700 ease-out group-hover:scale-[1.03]">
      <DotLottieReact
        src={src}
        loop
        autoplay
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
