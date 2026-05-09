import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { MOCK_ASSETS } from "@/lib/mock/assets";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const now = new Date();

  // Static high-value pages
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/ai-generate`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  // Approved assets — pull from DB if available, otherwise fall back to the
  // mock list so the sitemap still produces something useful pre-seeding.
  let assets: { id: string; updatedAt: Date }[] = [];
  try {
    assets = await prisma.asset.findMany({
      where: { status: "APPROVED" },
      select: { id: true, updatedAt: true },
      take: 5000,
      orderBy: { updatedAt: "desc" },
    });
  } catch {
    assets = MOCK_ASSETS.map((m) => ({ id: m.id, updatedAt: now }));
  }

  const assetEntries: MetadataRoute.Sitemap = assets.map((a) => ({
    url: `${base}/explore/${a.id}`,
    lastModified: a.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...assetEntries];
}
