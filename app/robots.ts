import type { MetadataRoute } from "next";

/**
 * Canonical public hostname. Same reasoning as sitemap.ts —
 * robots.txt needs to point at the absolute sitemap URL on the
 * exact verified hostname, and that has to stay stable regardless
 * of env drift.
 */
const SITE_URL = "https://www.dezignxo.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/explore", "/ai-generate"],
        // Authed surfaces, admin, API, and checkout aren't useful to index.
        disallow: [
          "/dashboard/",
          "/admin/",
          "/checkout/",
          "/api/",
          "/login",
          "/register",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
