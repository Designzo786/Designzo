import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
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

    return [
      { source: "/(.*)", headers: baseHeaders },
      // Stronger caching for the image-optimization output and static assets
      {
        source: "/_next/image(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
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
