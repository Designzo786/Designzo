import { Suspense, cache } from "react";
import { unstable_cache } from "next/cache";
import {
  CATEGORIES,
  type AssetFilters,
  type MockAssetShape,
} from "@/lib/mock/assets";
import { AssetCard, type AssetCardData } from "@/components/assets/AssetCard";
import { FilterSidebar } from "./_components/FilterSidebar";
import { SortDropdown } from "./_components/SortDropdown";
import { EmptyState } from "./_components/EmptyState";
import { prisma } from "@/lib/prisma";
import { creatorDisplayName } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const metadata = {
  title: "Explore — Browse premium assets",
};

// ISR: serve from edge cache for 60s. Admin approve/reject calls
// `revalidateTag("assets")` so changes show up instantly anyway.
export const revalidate = 60;

interface SearchParams {
  q?: string;
  category?: string;
  price?: string;
  fileType?: string;
  sort?: string;
}

// Default preview shape/color for uploads with no preview image and no
// model — keeps the card preview from rendering blank.
const FALLBACK_SHAPE: MockAssetShape = "icosahedron";
const FALLBACK_COLOR = "#7c3aed";

function buildOrderBy(
  sort: AssetFilters["sort"]
): Prisma.AssetOrderByWithRelationInput {
  switch (sort) {
    case "popular":
      return { downloads: "desc" };
    case "price-asc":
      return { price: "asc" };
    case "price-desc":
      return { price: "desc" };
    case "rating":
      // No rating column on Asset yet — best proxy is most-downloaded
      return { downloads: "desc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

function buildWhere(filters: AssetFilters): Prisma.AssetWhereInput {
  const where: Prisma.AssetWhereInput = { status: "APPROVED" };

  if (filters.category) where.category = filters.category;
  if (filters.fileType) {
    where.fileType = filters.fileType as Prisma.AssetWhereInput["fileType"];
  }

  switch (filters.price) {
    case "free":
      where.price = 0;
      break;
    case "under-200":
      where.price = { gt: 0, lt: 20000 };
      break;
    case "under-500":
      where.price = { gt: 0, lt: 50000 };
      break;
    case "500-plus":
      where.price = { gte: 50000 };
      break;
  }

  if (filters.q) {
    const q = filters.q;
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { tags: { has: q.toLowerCase() } },
    ];
  }

  return where;
}

// Card-list select: pulls only what AssetCard renders. Description, fileKey,
// modelKey, KYC fields, etc. stay on the server — keeps the JSON payload small
// and the wire transfer fast.
const CARD_SELECT = {
  id: true,
  title: true,
  price: true,
  downloads: true,
  avgRating: true,
  reviewCount: true,
  category: true,
  fileType: true,
  previewKey: true,
  uploader: { select: { name: true, role: true } },
} satisfies Prisma.AssetSelect;

// Cached, deduped browse query. `cache()` (React) dedupes within one render —
// `unstable_cache` (Next) persists across requests and is keyed by filters,
// purged via the "assets" tag when admin approves/rejects an upload.
// DB calls wrapped so a Neon outage degrades the explore page to an empty
// listing instead of crashing — the page renders with "0 results" and the
// filter sidebar / sort dropdown still work.
const fetchBrowseAssets = cache(
  (filters: AssetFilters) =>
    unstable_cache(
      async () => {
        try {
          const [dbAssets, totalApproved] = await Promise.all([
            prisma.asset.findMany({
              where: buildWhere(filters),
              orderBy: buildOrderBy(filters.sort),
              select: CARD_SELECT,
              take: 96,
            }),
            prisma.asset.count({ where: { status: "APPROVED" } }),
          ]);
          return { dbAssets, totalApproved };
        } catch (err) {
          console.error("[explore] fetch failed:", err);
          return { dbAssets: [], totalApproved: 0 };
        }
      },
      ["explore-browse", JSON.stringify(filters)],
      { tags: ["assets"], revalidate: 60 }
    )()
);

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const filters: AssetFilters = {
    q: sp.q,
    category: sp.category,
    price: sp.price as AssetFilters["price"],
    fileType: sp.fileType,
    sort: sp.sort as AssetFilters["sort"],
  };

  const { dbAssets, totalApproved } = await fetchBrowseAssets(filters);

  const results: AssetCardData[] = dbAssets.map((a) => ({
    id: a.id,
    title: a.title,
    creator: creatorDisplayName(a.uploader.name, a.uploader.role),
    price: a.price,
    rating: a.avgRating,
    reviewCount: a.reviewCount,
    downloads: a.downloads,
    preview: { shape: FALLBACK_SHAPE, color: FALLBACK_COLOR },
    previewImage: a.previewKey || undefined,
  }));

  const categoryName = sp.category
    ? CATEGORIES.find((c) => c.slug === sp.category)?.name
    : null;

  const heading = sp.q
    ? `Results for "${sp.q}"`
    : categoryName ?? "Explore the marketplace";

  const subheading = sp.q
    ? `${results.length} ${results.length === 1 ? "asset" : "assets"} found`
    : `${results.length} of ${totalApproved} premium assets from world-class creators`;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          {heading}
        </h1>
        <p className="mt-2 text-secondary">{subheading}</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        <Suspense fallback={null}>
          <FilterSidebar />
        </Suspense>

        <section className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-5">
            <div className="text-sm text-muted">
              <span className="font-medium text-primary">{results.length}</span>{" "}
              {results.length === 1 ? "result" : "results"}
            </div>
            <Suspense fallback={null}>
              <SortDropdown />
            </Suspense>
          </div>

          {results.length === 0 ? (
            <EmptyState query={sp.q} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {results.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
