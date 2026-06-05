import Link from "next/link";
import dynamic from "next/dynamic";
import { Star, Download } from "lucide-react";
import { formatPrice, formatNumber } from "@/lib/utils";
import type { MockAssetShape } from "@/lib/mock/assets";

const AssetCardPreview = dynamic(
  () => import("./AssetCardPreview"),
  { loading: () => <div className="absolute inset-0 skeleton" /> }
);

export interface AssetCardData {
  id: string;
  title: string;
  creator: string;
  price: number;
  rating: number;
  reviewCount?: number;
  downloads: number;
  preview: { shape: MockAssetShape; color: string };
  previewImage?: string;
}

/**
 * Premium-but-restrained asset card.
 *
 * Earlier versions stacked vignettes, gradients, pulsing badges, rings,
 * and halos on top of one another — visually busy, not premium. This
 * cut goes the other way: clean image, two-line text block, a single
 * subtle hover state (border tint + 2px lift). The image only scales
 * 3% on hover, slowly (700ms ease-out), so the motion reads as
 * "alive", never jittery.
 */
export function AssetCard({ asset }: { asset: AssetCardData }) {
  const isFree = asset.price === 0;
  const hasImage = !!asset.previewImage;
  const hasRating = !!(asset.reviewCount && asset.reviewCount > 0);
  // One stat at the bottom — rating if there is one, otherwise downloads
  // if there are any. If neither, the row is omitted entirely so the
  // footer doesn't render with empty "New · 0" filler text.
  const showRating = hasRating;
  const showDownloads = !hasRating && asset.downloads > 0;

  return (
    <Link
      href={`/explore/${asset.id}`}
      className="
        group block rounded-2xl overflow-hidden
        border border-border bg-surface
        transition-all duration-300 ease-out
        hover:border-accent/40 hover:-translate-y-0.5
      "
    >
      {/* Image area — neutral elevated surface behind transparent uploads. */}
      <div className="relative aspect-[4/3] overflow-hidden bg-elevated">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.previewImage}
            alt={asset.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <AssetCardPreview
            shape={asset.preview.shape}
            color={asset.preview.color}
          />
        )}

        {isFree && (
          <div className="absolute top-3 left-3 badge badge-free pointer-events-none">
            Free
          </div>
        )}
      </div>

      {/* Content — title + price, then creator (with optional inline stat
          on the right). Restrained typography, no separators, no halos. */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-primary truncate flex-1">
            {asset.title}
          </h3>
          <span
            className={`text-sm font-semibold shrink-0 tabular-nums ${
              isFree ? "text-info" : "text-primary"
            }`}
          >
            {formatPrice(asset.price)}
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted">
          <span className="truncate">by {asset.creator}</span>
          {showRating && (
            <span className="inline-flex items-center gap-1 shrink-0">
              <Star className="w-3 h-3 fill-gold text-gold" />
              <span className="text-secondary tabular-nums">
                {asset.rating.toFixed(1)}
              </span>
            </span>
          )}
          {showDownloads && (
            <span className="inline-flex items-center gap-1 shrink-0">
              <Download className="w-3 h-3" />
              <span className="tabular-nums">
                {formatNumber(asset.downloads)}
              </span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
