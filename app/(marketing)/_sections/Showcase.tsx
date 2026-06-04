import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { creatorDisplayName } from "@/lib/utils";
import { AssetCard, type AssetCardData } from "@/components/assets/AssetCard";

// Default preview shape/color used when an uploaded asset has no preview
// image and no .glb model — the 3D card always renders *something*.
const FALLBACK_SHAPE = "icosahedron" as const;
const FALLBACK_COLOR = "#7c3aed";

// Cached across requests, keyed nothing-special, purged by the "assets" tag
// whenever an admin approves/rejects an upload — same tag the Explore page uses.
//
// The DB call is wrapped in a try/catch so a Neon outage / cold start
// doesn't crash the home page — the showcase simply hides itself when
// it returns an empty array (handled below).
const fetchFeatured = unstable_cache(
  async () => {
    try {
      return await prisma.asset.findMany({
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
          uploader: { select: { name: true, role: true, email: true } },
        },
      });
    } catch (err) {
      console.error("[home/Showcase] fetch failed:", err);
      return [];
    }
  },
  ["home-featured"],
  { tags: ["assets"], revalidate: 60 }
);

export async function Showcase() {
  const dbAssets = await fetchFeatured();

  // Nothing approved yet — hide the whole section rather than show an
  // empty grid under a "Stunning 3D" headline.
  if (dbAssets.length === 0) return null;

  const featured: AssetCardData[] = dbAssets.map((a) => ({
    id: a.id,
    title: a.title,
    creator: creatorDisplayName(
      a.uploader.name,
      a.uploader.role,
      a.uploader.email
    ),
    price: a.price,
    rating: a.avgRating,
    reviewCount: a.reviewCount,
    downloads: a.downloads,
    preview: { shape: FALLBACK_SHAPE, color: FALLBACK_COLOR },
    previewImage: a.previewKey || undefined,
  }));

  return (
    <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
        <div className="inline-block px-3 py-1 rounded-full bg-accent-muted border border-accent/20 text-xs font-medium text-accent-light mb-4">
          Live Previews
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          See it before you buy
        </h2>
        <p className="mt-3 text-secondary">
          Every asset — 3D, Lottie, SVG, material — ships with an
          interactive preview. Click any card to inspect it.
        </p>
      </div>

      {/* Phone: swipeable horizontal carousel; sm+: grid */}
      <div className="scroll-row scroll-row--cols-2 scroll-row--cols-3">
        {featured.map((asset) => (
          <div key={asset.id}>
            <AssetCard asset={asset} />
          </div>
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
