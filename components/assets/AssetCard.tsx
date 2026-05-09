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
  downloads: number;
  preview: { shape: MockAssetShape; color: string };
  // Set for real user uploads — overrides the 3D fallback preview
  previewImage?: string;
}

export function AssetCard({ asset }: { asset: AssetCardData }) {
  const isFree = asset.price === 0;
  const hasImage = !!asset.previewImage;

  return (
    <Link
      href={`/explore/${asset.id}`}
      className="group relative rounded-2xl border border-border hover:border-accent/40 bg-surface overflow-hidden transition-all hover:shadow-[0_0_32px_rgba(124,58,237,0.18)]"
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-elevated to-canvas overflow-hidden">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.previewImage}
            alt={asset.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <AssetCardPreview shape={asset.preview.shape} color={asset.preview.color} />
        )}
        {isFree && (
          <div className="absolute top-3 left-3 badge badge-free pointer-events-none">
            Free
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-primary truncate group-hover:text-accent-light transition-colors">
              {asset.title}
            </h3>
            <p className="text-xs text-muted mt-0.5 truncate">by {asset.creator}</p>
          </div>
          <div
            className={`text-sm font-bold shrink-0 ${
              isFree ? "text-info" : "gradient-text"
            }`}
          >
            {formatPrice(asset.price)}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Star className="w-3 h-3 fill-gold text-gold" />
            <span className="text-secondary">{asset.rating.toFixed(1)}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Download className="w-3 h-3" />
            {formatNumber(asset.downloads)}
          </span>
        </div>
      </div>
    </Link>
  );
}
