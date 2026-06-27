import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

/**
 * Canonical public hostname for SEO output. Hardcoded on purpose —
 * the sitemap MUST list URLs on the exact hostname Google verified in
 * Search Console, and that has to stay stable even if NEXTAUTH_URL
 * env drifts (preview deploys, env-vars-not-yet-set, the dev
 * `http://localhost:3000` default). Anything env-driven here risks
 * Google rejecting every URL with "URL not allowed" errors the moment
 * the env value doesn't match the verified property.
 *
 * If we ever move to a different domain, change this in one place +
 * redeploy.
 */
const SITE_URL = "https://www.dezignxo.com";

/**
 * XML sitemap served at /sitemap.xml.
 *
 * Three tiers of URLs:
 *
 *   1. Top-of-funnel + the marketplace — home, explore, AI tool,
 *      seller landing. Highest priority + most aggressive
 *      changeFrequency because they're SERP entry points and
 *      refresh whenever a new asset clears the review queue.
 *
 *   2. Evergreen marketing / docs / legal — every page that's
 *      allowed to index per robots.ts. They don't change often,
 *      but listing them explicitly speeds up Google's initial
 *      discovery from weeks → days.
 *
 *   3. Approved assets — one URL per APPROVED Asset row, capped
 *      at 5000 (well under Google's 50k-per-sitemap limit).
 *
 * Re-renders on demand, so an admin approving a new asset surfaces
 * in the very next Google crawl without a redeploy.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Tier 1: marketplace + AI tool — the highest-CTR pages ──────────
  const topEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/explore`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/ai-generate`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/sell`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // ── Tier 2: marketing, docs, legal, support — discoverability ──────
  const evergreenPaths: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    // Brand + sales
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
    { path: "/community", priority: 0.5, changeFrequency: "monthly" },
    // Docs
    { path: "/docs", priority: 0.6, changeFrequency: "monthly" },
    { path: "/docs/creators", priority: 0.6, changeFrequency: "monthly" },
    { path: "/docs/license", priority: 0.5, changeFrequency: "yearly" },
    { path: "/help", priority: 0.6, changeFrequency: "monthly" },
    // Legal
    { path: "/privacy", priority: 0.4, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.4, changeFrequency: "yearly" },
    { path: "/cookies", priority: 0.3, changeFrequency: "yearly" },
  ];
  const evergreenEntries: MetadataRoute.Sitemap = evergreenPaths.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  // ── Tier 3: every approved asset ──────────────────────────────────
  // If the DB is unreachable we ship just the static set — the next
  // successful sitemap fetch picks the assets back up.
  const assets = await prisma.asset
    .findMany({
      where: { status: "APPROVED" },
      select: { id: true, updatedAt: true },
      take: 5000,
      orderBy: { updatedAt: "desc" },
    })
    .catch(() => [] as { id: string; updatedAt: Date }[]);

  const assetEntries: MetadataRoute.Sitemap = assets.map((a) => ({
    url: `${SITE_URL}/explore/${a.id}`,
    lastModified: a.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...topEntries, ...evergreenEntries, ...assetEntries];
}
