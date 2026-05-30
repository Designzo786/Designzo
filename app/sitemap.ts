import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getPublicBaseUrl } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getPublicBaseUrl();
  const now = new Date();

  // Static high-value pages
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/ai-generate`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  // Approved assets from the DB. If the DB is unreachable, the sitemap
  // simply omits the asset entries rather than serving stale mock data.
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

  return [...staticEntries, ...assetEntries];
}
