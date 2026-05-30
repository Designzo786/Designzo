import Link from "next/link";
import { Heart, ShoppingCart, Download } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const session = await auth();
  if (!session) return null;
  // Wishlist is open to every role — buyers, creators, admins. They all
  // bookmark assets they want to come back to.

  // Pull saved likes joined with their assets. Filter out anything that
  // got unpublished after the user saved it (status !== APPROVED).
  const likes = await prisma.assetLike.findMany({
    where: {
      userId: session.user.id,
      asset: { status: "APPROVED" },
    },
    include: {
      asset: {
        select: {
          id: true,
          title: true,
          previewKey: true,
          fileType: true,
          price: true,
          uploader: { select: { name: true } },
        },
      },
    },
    orderBy: { id: "desc" },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Wishlist
        </h1>
        <p className="text-sm text-muted mt-1">
          {likes.length === 0
            ? "Save assets you want to come back to. They'll show up here."
            : `${likes.length} asset${likes.length === 1 ? "" : "s"} saved.`}
        </p>
      </header>

      {likes.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No saved assets yet"
          description="Tap the Save button on any asset and it lands here. Easy way to keep track of things you want to grab later."
          cta={{ href: "/explore", label: "Browse marketplace" }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {likes.map(({ asset }) => {
            const isFree = asset.price === 0;
            return (
              <article
                key={asset.id}
                className="rounded-xl border border-border bg-surface overflow-hidden flex flex-col"
              >
                <Link
                  href={`/explore/${asset.id}`}
                  className="block aspect-[4/3] bg-elevated relative overflow-hidden group"
                >
                  {asset.previewKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.previewKey}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted text-xs">
                      No preview
                    </div>
                  )}
                  {isFree && (
                    <div className="absolute top-2 left-2 badge badge-free pointer-events-none">
                      Free
                    </div>
                  )}
                </Link>

                <div className="p-4 flex-1 flex flex-col">
                  <Link href={`/explore/${asset.id}`}>
                    <h3 className="font-semibold text-primary hover:text-accent-light transition-colors text-sm truncate">
                      {asset.title}
                    </h3>
                  </Link>
                  <p className="text-xs text-muted mt-0.5 truncate">
                    by {asset.uploader.name ?? "Unknown"}
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={`text-base font-bold ${isFree ? "text-info" : "gradient-text"}`}
                    >
                      {formatPrice(asset.price)}
                    </span>
                  </div>

                  <Link
                    href={`/explore/${asset.id}`}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white gradient-accent shadow-[0_0_18px_rgba(124,58,237,0.25)] hover:shadow-[0_0_24px_rgba(124,58,237,0.4)] transition-shadow"
                  >
                    {isFree ? (
                      <>
                        <Download className="w-4 h-4" />
                        Get for free
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        View &amp; buy
                      </>
                    )}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
