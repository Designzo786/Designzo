import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAssetById } from "@/lib/mock/assets";
import { AssetCard, type AssetCardData } from "@/components/assets/AssetCard";

// Fallback preview for real uploads with no matching mock entry — keeps the
// 3D card from looking broken when there's no preview image.
const FALLBACK_SHAPE = "icosahedron" as const;
const FALLBACK_COLOR = "#7c3aed";

// Cached across requests, keyed nothing-special, purged by the "assets" tag
// whenever an admin approves/rejects an upload — same tag the Explore page uses.
const fetchFeatured = unstable_cache(
  async () => {
    return prisma.asset.findMany({
      where: { status: "APPROVED" },
      orderBy: { downloads: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        price: true,
        downloads: true,
        avgRating: true,
        reviewCount: true,
        previewKey: true,
        uploader: { select: { name: true } },
      },
    });
  },
  ["home-featured"],
  { tags: ["assets"], revalidate: 60 }
);

export async function Showcase() {
  const dbAssets = await fetchFeatured();

  // Nothing approved yet — hide the whole section rather than show an
  // empty grid under a "Stunning 3D" headline.
  if (dbAssets.length === 0) return null;

  const featured: AssetCardData[] = dbAssets.map((a) => {
    const mockMatch = getAssetById(a.id);
    return {
      id: a.id,
      title: a.title,
      creator: a.uploader.name ?? "Unknown",
      price: a.price,
      rating: a.avgRating,
      reviewCount: a.reviewCount,
      downloads: a.downloads,
      preview: {
        shape: mockMatch?.preview.shape ?? FALLBACK_SHAPE,
        color: mockMatch?.preview.color ?? FALLBACK_COLOR,
      },
      previewImage: a.previewKey || undefined,
    };
  });

  return (
    <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="inline-block px-3 py-1 rounded-full bg-accent-muted border border-accent/20 text-xs font-medium text-accent-light mb-4">
          Interactive 3D Previews
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Stunning 3D, right in your browser
        </h2>
        <p className="mt-3 text-secondary">
          Every asset ships with a real-time interactive preview. Click any card
          to inspect every angle.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {featured.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:border-accent/40 text-sm font-medium text-secondary hover:text-accent-light transition-colors"
        >
          Browse all assets
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
