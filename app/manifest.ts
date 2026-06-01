/**
 * Web app manifest — lets browsers treat Designzo as an installable PWA
 * (Add to Home Screen on mobile, "Install app" on desktop Chrome). Light
 * touch: just the basics, no service worker yet. The `theme_color` and
 * `background_color` match the dark canvas so the splash screen doesn't
 * flash white.
 */
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Designzo — 3D Asset Marketplace",
    short_name: "Designzo",
    description:
      "Browse, buy and sell premium 3D & AR assets. Built by creators, for creators.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b10",
    theme_color: "#0b0b10",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
