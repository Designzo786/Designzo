import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

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
