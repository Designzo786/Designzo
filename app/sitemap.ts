import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getPublicBaseUrl } from "@/lib/env";

/**
 * XML sitemap served at /sitemap.xml.
 *
 * Three tiers of URLs in priority order:
 *
 *   1. Top-of-funnel + the marketplace itself — home, explore, the
 *      AI tool. Highest priority + most aggressive change frequency
 *      because they're the SERP entry points and refresh hourly /
 *      daily as listings approve.
 *
 *   2. Marketing + docs + legal — every page that's allowed to index
 *      per robots.ts. These don't change often, but listing them in
 *      the sitemap dramatically speeds up Google's initial discovery
 *      so they appear in SERP within days instead of weeks.
 *
 *   3. Approved assets — one URL per APPROVED Asset row. Capped at
 *      5000 entries (well under Google's 50k-per-sitemap limit). If
 *      the DB is unreachable we ship just the static set rather than
 *      a stale mock — the sitemap re-renders on every request so the
 *      next successful crawl picks the assets back up.
 *
 * The output is re-rendered on demand (Next.js wraps this function as
 * a server route), so admin approvals show up in the next Google
 * crawl without a redeploy.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getPublicBaseUrl();
  const now = new Date();

  // ── Tier 1: marketplace + AI tool — the highest-CTR pages ──────────
  const topEntries: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/explore`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/ai-generate`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${base}/sell`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // ── Tier 2: marketing, docs, legal, support — discoverability ──────
  // Listed explicitly (rather than crawled) so Google indexes them
  // immediately on first sitemap fetch instead of having to follow
  // links from the home page. Priority + change frequency tuned per
  // page family so the crawler spends its budget where things
  // actually change.
  const evergreenPaths: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    // Brand + sales
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
    { path: "/community", priority: 0.5, changeFrequency: "monthly" },
    // Docs — middle tier, refreshed sometimes
    { path: "/docs", priority: 0.6, changeFrequency: "monthly" },
    { path: "/docs/creators", priority: 0.6, changeFrequency: "monthly" },
    { path: "/docs/license", priority: 0.5, changeFrequency: "yearly" },
    { path: "/help", priority: 0.6, changeFrequency: "monthly" },
    // Legal — low change, must-index
    { path: "/privacy", priority: 0.4, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.4, changeFrequency: "yearly" },
    { path: "/cookies", priority: 0.3, changeFrequency: "yearly" },
  ];
  const evergreenEntries: MetadataRoute.Sitemap = evergreenPaths.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  // ── Tier 3: every approved asset ──────────────────────────────────
  // Capped at 5000 — Google's per-sitemap limit is 50k but anything
  // beyond ~5k stresses serverless function memory on Vercel free
  // tier. If you ever exceed 5k approved assets, split into multiple
  // sitemaps via a sitemap index (Next supports this via
  // generateSitemaps).
  const assets = await prisma.asset
    .findMany({
      where: { status: "APPROVED" },
      select: { id: true, updatedAt: true },
      take: 5000,
      orderBy: { updatedAt: "desc" },
    })
    .catch(() => [] as { id: string; updatedAt: Date }[]);

  const assetEntries: MetadataRoute.Sitemap = assets.map((a) => ({
    url: `${base}/explore/${a.id}`,
    lastModified: a.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...topEntries, ...evergreenEntries, ...assetEntries];
}
