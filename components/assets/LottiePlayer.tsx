"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface Props {
  src: string;
}

/**
 * Lottie animation player wrapper. Handles both standard Lottie JSON
 * (Bodymovin export) and the newer dotLottie ZIP format — dotlottie-react
 * sniffs the format from the URL extension automatically.
 *
 * The animation plays on loop with autoplay and respects prefers-reduced-
 * motion at the OS level (the player checks media queries itself).
 *
 * Sized to fill its container — the parent asset detail card is responsible
 * for setting the aspect ratio.
 */
export function LottiePlayer({ src }: Props) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <DotLottieReact
        src={src}
        loop
        autoplay
        // Preserve aspect ratio within the bounds — `meet` is the SVG equivalent.
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
