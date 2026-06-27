import type { NextConfig } from "next";
import path from "node:path";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Pin the workspace root. A stray package-lock.json in the parent directory
  // otherwise makes Turbopack infer the wrong root and emit a build warning.
  turbopack: {
    root: path.join(__dirname),
  },

  // Hide Next.js fingerprint
  poweredByHeader: false,

  // React Strict Mode catches bugs early without breaking production renders.
  reactStrictMode: true,

  // Compress responses for free bandwidth wins
  compress: true,

  images: {
    remotePatterns: [
      // Cloudflare R2 custom domain (set R2_PUBLIC_URL in env)
      { protocol: "https", hostname: "*.r2.dev" },
      // R2 worker subdomain (if using Cloudflare Workers for serving)
      { protocol: "https", hostname: "*.cloudflarestorage.com" },
      // Google OAuth avatars
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // GitHub OAuth avatars (in case added later)
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24, // 24h cache on optimized images
  },

  // Keep heavy server-side packages out of the edge / client bundle
  serverExternalPackages: ["@prisma/client", "bcryptjs", "prisma"],

  // Security headers
  async headers() {
    const baseHeaders = [
      { key: "X-Content-Type-Options",    value: "nosniff" },
      { key: "X-Frame-Options",           value: "DENY" },
      { key: "X-XSS-Protection",          value: "1; mode=block" },
      { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
    ];

    // HSTS only makes sense over HTTPS — never in dev
    if (isProd) {
      baseHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    // 1 year, immutable — used for any asset whose URL contains a build
    // hash or other strong cache-busting token.
    const LONG_CACHE = "public, max-age=31536000, immutable";
    // 1 day stale-while-revalidate — for resources that don't have a
    // hash in the URL but where serving slightly-stale bytes is fine
    // because the next request will refresh.
    const DAILY_SWR = "public, max-age=86400, stale-while-revalidate=604800";

    return [
      { source: "/(.*)", headers: baseHeaders },
      // Hashed Next.js static chunks + image optimizer output — strong
      // immutable cache. Files are fingerprinted so a new build serves
      // new URLs; the CDN can hold the old ones forever.
      {
        source: "/_next/image(.*)",
        headers: [{ key: "Cache-Control", value: LONG_CACHE }],
      },
      {
        source: "/_next/static/(.*)",
        headers: [{ key: "Cache-Control", value: LONG_CACHE }],
      },
      // Favicons, manifest, robots, sitemap — not hashed, but they
      // change rarely. Long max-age + SWR so the CDN serves the
      // cached copy until the next 1-day window while the origin
      // re-warms in the background. Cuts Lighthouse "Use efficient
      // cache lifetimes" from 4 MB → ~0.
      {
        source: "/favicon.ico",
        headers: [{ key: "Cache-Control", value: DAILY_SWR }],
      },
      {
        source: "/icon.svg",
        headers: [{ key: "Cache-Control", value: DAILY_SWR }],
      },
      {
        source: "/apple-icon",
        headers: [{ key: "Cache-Control", value: DAILY_SWR }],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: DAILY_SWR }],
      },
      {
        source: "/robots.txt",
        headers: [{ key: "Cache-Control", value: DAILY_SWR }],
      },
      {
        source: "/sitemap.xml",
        headers: [
          // Shorter cache — admin approvals show up faster when
          // Google re-crawls.
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/api/assets/:path*/download",
        headers: [
          // Downloads are user-specific; never cache via CDN
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
