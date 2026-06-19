import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { creatorDisplayName } from "@/lib/utils";
import { AssetCard, type AssetCardData } from "@/components/assets/AssetCard";

const FALLBACK_SHAPE = "icosahedron" as const;
const FALLBACK_COLOR = "#7c3aed";

interface Props {
  /** Category slug, e.g. "3d-icons" / "lottie" / "svg-icons". */
  categorySlug: string;
  /** Eyebrow label shown in the accent pill at the top of the section. */
  eyebrow: string;
  /** Lucide icon to render in the eyebrow pill. */
  icon: LucideIcon;
  /** Big H2 — sells what the category is. */
  heading: string;
  /** Sub-heading line under the H2. */
  subheading: string;
  /**
   * Tailwind classes for the accent pill (bg, border, text colour). Each
   * category gets its own hue so the home page reads as a curated set
   * rather than three identical violet panels.
   */
  pillAccent: string;
  /** Optional override for the "Browse all" CTA label. */
  ctaLabel?: string;
}

/**
 * Per-category showcase rail. Shows the 6 most recent APPROVED assets in
 * a single category, with a category-tinted eyebrow + heading and a
 * "Browse all <category>" CTA pointing at the filtered explore page.
 *
 * The whole section returns `null` (renders nothing) when:
 *   - no APPROVED assets exist for the category yet, OR
 *   - the DB query throws (Neon cold-start, etc.).
 * That keeps the home page clean on a brand-new install AND on transient
 * outages instead of showing an empty rail under a "Premium 3D Icons"
 * heading.
 *
 * Each category instance has its own cache key + revalidation tag so the
 * rails refresh independently when an admin approves or rejects an
 * asset in that category.
 */
async function fetchCategoryAssets(categorySlug: string) {
  try {
    return await prisma.asset.findMany({
      where: { status: "APPROVED", category: categorySlug },
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
        // Drives the "Pack · N icons" badge on the card so buyers see
        // bundled listings at a glance on the per-category rails.
        _count: { select: { packItems: true } },
        uploader: { select: { name: true, role: true, email: true } },
      },
    });
  } catch (err) {
    console.error(
      `[home/CategoryShowcase:${categorySlug}] fetch failed:`,
      err
    );
    return [];
  }
}

/**
 * Wrap the fetch in a per-category unstable_cache instance. Defined at
 * module scope (not inside the component) so the same cache slot is
 * reused across requests within the 60s revalidation window.
 */
const cachedFetch = (categorySlug: string) =>
  unstable_cache(
    () => fetchCategoryAssets(categorySlug),
    [`home-category-${categorySlug}`],
    { tags: ["assets", `assets:${categorySlug}`], revalidate: 60 }
  )();

export async function CategoryShowcase({
  categorySlug,
  eyebrow,
  icon: Icon,
  heading,
  subheading,
  pillAccent,
  ctaLabel,
}: Props) {
  const rows = await cachedFetch(categorySlug);
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
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 ${pillAccent}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {eyebrow}
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            {heading}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-secondary max-w-lg">
            {subheading}
          </p>
        </div>
        <Link
          href={`/explore?category=${categorySlug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-light hover:text-accent transition-colors group shrink-0"
        >
          {ctaLabel ?? `Browse all ${eyebrow.toLowerCase()}`}
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
