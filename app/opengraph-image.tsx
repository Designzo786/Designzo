/**
 * Default Open Graph / Twitter card — the 1200×630 image that shows when the
 * site is shared on social or in messaging apps. Generated at request time
 * via `next/og`, so it always reflects whatever brand mark we ship in code
 * (no PNG to keep in sync). Twitter falls back to this when no
 * twitter-image.* is defined, so this single file covers both.
 */
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Designo — the marketplace for premium 3D & AR assets.";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(ellipse at top, #1f0f3a 0%, #0b0b10 60%, #08080c 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
        }}
      >
        {/* Brand mark — same iso cube as the favicon, scaled up. */}
        <svg
          width="190"
          height="190"
          viewBox="0 0 64 64"
          style={{ marginBottom: 36 }}
        >
          <path d="M32 12 L52 22 L32 32 L12 22 Z" fill="#c084fc" />
          <path d="M12 22 L32 32 L32 52 L12 42 Z" fill="#7c3aed" />
          <path d="M52 22 L32 32 L32 52 L52 42 Z" fill="#a855f7" />
        </svg>

        {/* Wordmark — "Game" tinted, "Changer" white, matching the navbar logo. */}
        <div
          style={{
            fontSize: 108,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: "#ffffff",
            display: "flex",
          }}
        >
          <span style={{ color: "#a855f7" }}>Game</span>
          <span>Changer</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 34,
            color: "#a8a8bd",
            marginTop: 24,
            textAlign: "center",
            display: "flex",
          }}
        >
          Premium 3D &amp; AR assets — built by creators, for creators.
        </div>
      </div>
    ),
    { ...size }
  );
}
