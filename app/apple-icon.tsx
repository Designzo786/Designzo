/**
 * Apple touch icon — rendered to a 180×180 PNG at request time so iOS shows
 * a branded icon when a user adds the site to their home screen. Uses the
 * same isometric cube as the favicon but on a purple-gradient field, since
 * iOS draws the icon on a tinted plate (a flat dark icon would disappear).
 */
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 64 64">
          <path
            d="M32 12 L52 22 L32 32 L12 22 Z"
            fill="#ffffff"
            fillOpacity="0.95"
          />
          <path
            d="M12 22 L32 32 L32 52 L12 42 Z"
            fill="#ffffff"
            fillOpacity="0.65"
          />
          <path
            d="M52 22 L32 32 L32 52 L52 42 Z"
            fill="#ffffff"
            fillOpacity="0.82"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
