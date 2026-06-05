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
  // Number of reviews — when 0 the card shows "New" instead of a 0.0 rating.
  reviewCount?: number;
  downloads: number;
  preview: { shape: MockAssetShape; color: string };
  // Set for real user uploads — overrides the 3D fallback preview
  previewImage?: string;
}

/**
 * Premium asset card.
 *
 * Design notes that drive the chrome:
 *  - The image area sits on `bg-elevated` so transparent / grey-background
 *    uploads (the most common kind) don't read as a foreign rectangle
 *    pasted onto the dark card surface.
 *  - Top edge gets a soft dark vignette so the optional "Free" badge has
 *    contrast without needing its own backdrop.
 *  - Bottom edge gets a gradient that fades from transparent into the
 *    card surface colour. The text block below overlaps this fade by a
 *    few pixels (negative margin) so the image and content read as a
 *    single continuous surface, not two stacked rectangles separated by
 *    a hairline border.
 *  - Hover lifts the card 4px, swaps the border to accent, and lights up
 *    a soft violet halo plus a 1px accent ring. The image itself scales
 *    1.05 over 500ms — slow enough to read as "alive", not jittery.
 */
export function AssetCard({ asset }: { asset: AssetCardData }) {
  const isFree = asset.price === 0;
  const hasImage = !!asset.previewImage;
  const hasRating = !!(asset.reviewCount && asset.reviewCount > 0);

  return (
    <Link
      href={`/explore/${asset.id}`}
      className="
        group relative rounded-2xl overflow-hidden
        border border-border bg-surface
        transition-all duration-300 ease-out
        shadow-[0_4px_20px_-8px_rgba(0,0,0,0.4)]
        hover:border-accent/40 hover:-translate-y-1
        hover:shadow-[0_24px_56px_-20px_rgba(124,58,237,0.45),0_0_0_1px_rgba(168,85,247,0.18)]
      "
    >
      {/* ─── Image area ─────────────────────────────────────────────────── */}
      <div className="relative aspect-[4/3] overflow-hidden bg-elevated">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.previewImage}
            alt={asset.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <AssetCardPreview
            shape={asset.preview.shape}
            color={asset.preview.color}
          />
        )}

        {/* Top-edge vignette — adds depth and contrast for the badge.
            Subtle (28% black) so it doesn't darken the actual subject. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-linear-to-b from-black/28 to-transparent"
        />

        {/* Bottom-edge fade — diffuses the image into the card surface
            colour so there's no harsh line between preview and content. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-surface via-surface/55 to-transparent"
        />

        {isFree && (
          <div className="absolute top-3 left-3 badge badge-free pointer-events-none">
            Free
          </div>
        )}
      </div>

      {/* ─── Content area ─────────────────────────────────────────────────
          Pulled up 12px to overlap the image's bottom fade. The fade
          gracefully covers the top of this block so the title appears to
          rise out of the image rather than sit on a divided panel. */}
      <div className="relative -mt-3 p-4 pt-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] sm:text-base font-semibold text-primary truncate group-hover:text-accent-light transition-colors">
              {asset.title}
            </h3>
            <p className="text-xs text-muted mt-0.5 truncate">
              by{" "}
              <span className="text-secondary font-medium">
                {asset.creator}
              </span>
            </p>
          </div>
          <div
            className={`text-base font-bold shrink-0 tabular-nums ${
              isFree ? "text-info" : "gradient-text"
            }`}
          >
            {formatPrice(asset.price)}
          </div>
        </div>

        {/* Stats row — rating (or "New" with a pulsing accent dot) and a
            download counter, separated by a faint middle dot. The
            accent-light dot on the "New" pill gives un-reviewed assets
            a tiny premium tell instead of a flat grey label. */}
        <div className="mt-3 flex items-center gap-2.5 text-xs text-muted">
          {hasRating ? (
            <span className="inline-flex items-center gap-1">
              <Star className="w-3 h-3 fill-gold text-gold" />
              <span className="text-secondary font-medium tabular-nums">
                {asset.rating.toFixed(1)}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-accent-light/80 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-light animate-pulse" />
              New
            </span>
          )}
          <span aria-hidden className="text-subtle">
            ·
          </span>
          <span className="inline-flex items-center gap-1">
            <Download className="w-3 h-3" />
            <span className="tabular-nums">
              {formatNumber(asset.downloads)}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
