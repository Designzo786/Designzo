import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { creatorDisplayName } from "@/lib/utils";
import { AssetCard, type AssetCardData } from "@/components/assets/AssetCard";

const FALLBACK_SHAPE = "icosahedron" as const;
const FALLBACK_COLOR = "#7c3aed";

/**
 * Newest-first rail. Distinct from <Showcase /> which sorts by downloads
 * (popularity). This is "what just landed" — gives buyers a reason to
 * return to the home page even when nothing has trended yet.
 *
 * Wrapped in a try/catch so a Neon cold start can't crash the home page;
 * an empty list hides the whole section.
 */
const fetchJustLanded = unstable_cache(
  async () => {
    try {
      return await prisma.asset.findMany({
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          price: true,
          downloads: true,
          avgRating: true,
          reviewCount: true,
          previewKey: true,
          // Drives the "Pack · N icons" badge on the card.
          _count: { select: { packItems: true } },
          uploader: { select: { name: true, role: true, email: true } },
        },
      });
    } catch (err) {
      console.error("[home/JustLanded] fetch failed:", err);
      return [];
    }
  },
  ["home-just-landed"],
  { tags: ["assets"], revalidate: 60 }
);

export async function JustLanded() {
  const rows = await fetchJustLanded();
  if (rows.length === 0) return null;

  const items: AssetCardData[] = rows.map((a) => ({
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
    packItemCount: a._count.packItems,
  }));

  return (
    <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8 sm:mb-10">
        <div className="min-w-0">
          {/* Pinging accent dot makes this rail feel "live" — sells the
              "newest" angle without needing to write "live" anywhere. */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-xs font-medium text-emerald-300 mb-4">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </span>
            Just landed
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            Fresh drops, straight from the studio
          </h2>
          <p className="mt-2 text-sm sm:text-base text-secondary max-w-lg">
            The three most recent assets to clear our review queue. New
            every day.
          </p>
        </div>
        <Link
          href="/explore?sort=newest"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-light hover:text-accent transition-colors group shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          Browse all new
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="scroll-row scroll-row--cols-3-at-sm">
        {items.map((asset) => (
          <div key={asset.id}>
            <AssetCard asset={asset} />
          </div>
        ))}
      </div>
    </section>
  );
}
