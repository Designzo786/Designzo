import type { MetadataRoute } from "next";
import { getPublicBaseUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = getPublicBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/explore", "/ai-generate"],
        // Authed surfaces, admin, API and checkout aren't useful to index
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
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
