import { Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/Avatar";
import { formatRelativeTime } from "@/lib/utils";
import { ReviewForm } from "./ReviewForm";

interface Props {
  assetId: string;
  avgRating: number;
  reviewCount: number;
  viewerId: string | null;
  // True when the viewer owns the asset and is not its uploader.
  canReview: boolean;
  isSignedIn: boolean;
}

/** Renders 5 stars, filled up to `value`. */
function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          style={{ width: size, height: size }}
          className={
            n <= Math.round(value)
              ? "fill-gold text-gold"
              : "text-muted/50"
          }
        />
      ))}
    </div>
  );
}

export async function AssetReviews({
  assetId,
  avgRating,
  reviewCount,
  viewerId,
  canReview,
  isSignedIn,
}: Props) {
  const reviews = await prisma.review.findMany({
    where: { assetId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      userId: true,
      user: { select: { name: true, image: true } },
    },
  });

  // The viewer's own review lives in the edit form, not the list.
  const myReview = viewerId
    ? reviews.find((r) => r.userId === viewerId)
    : undefined;
  const others = reviews.filter((r) => r.userId !== viewerId);

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <header className="flex items-center justify-between gap-4 mb-5">
        <h2 className="text-lg font-semibold text-primary">Reviews</h2>
        {reviewCount > 0 && (
          <div className="flex items-center gap-2">
            <Stars value={avgRating} size={16} />
            <span className="text-sm font-semibold text-primary">
              {avgRating.toFixed(1)}
            </span>
            <span className="text-sm text-muted">
              ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
            </span>
          </div>
        )}
      </header>

      {canReview ? (
        <div className="mb-6">
          <ReviewForm
            assetId={assetId}
            initialRating={myReview?.rating ?? 0}
            initialComment={myReview?.comment ?? ""}
          />
        </div>
      ) : (
        <p className="mb-6 text-xs text-muted">
          {isSignedIn
            ? "Only buyers who own this asset can leave a review."
            : "Sign in and add this asset to your library to leave a review."}
        </p>
      )}

      {others.length === 0 ? (
        <p className="text-sm text-muted">
          {reviewCount === 0
            ? "No reviews yet — be the first to share your thoughts."
            : "No other reviews yet."}
        </p>
      ) : (
        <ul className="space-y-5">
          {others.map((r) => (
            <li key={r.id} className="flex gap-3">
              <Avatar src={r.user.image} name={r.user.name} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-primary">
                    {r.user.name ?? "User"}
                  </span>
                  <span className="text-xs text-muted">
                    {formatRelativeTime(r.createdAt)}
                  </span>
                </div>
                <div className="mt-1">
                  <Stars value={r.rating} />
                </div>
                {r.comment && (
                  <p className="text-sm text-secondary leading-relaxed mt-1.5 whitespace-pre-line">
                    {r.comment}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
