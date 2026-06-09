import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/Avatar";
import { creatorDisplayName, formatNumber } from "@/lib/utils";

/**
 * Featured creators — top 3 accounts by approved-upload count, surfaced
 * with their avatar, public display name, role badge, and prolific
 * stats. A discovery surface that sells "people make great work here"
 * the same way Showcase sells "great work is for sale here".
 *
 * Wrapped in a try/catch so a Neon outage hides the section instead of
 * crashing the home page.
 */
const fetchFeaturedCreators = unstable_cache(
  async () => {
    try {
      // Group approved assets by uploader to find the top contributors,
      // then hydrate each with the user record + aggregate metrics.
      const grouped = await prisma.asset.groupBy({
        by: ["uploaderId"],
        where: { status: "APPROVED" },
        _count: { _all: true },
        _sum: { downloads: true },
        orderBy: { _count: { uploaderId: "desc" } },
        take: 3,
      });
      if (grouped.length === 0) return [];

      const users = await prisma.user.findMany({
        where: { id: { in: grouped.map((g) => g.uploaderId) } },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          bio: true,
        },
      });

      // Map back into ranked order with metrics attached.
      const byId = new Map(users.map((u) => [u.id, u]));
      return grouped
        .map((g) => {
          const user = byId.get(g.uploaderId);
          if (!user) return null;
          return {
            id: user.id,
            displayName: creatorDisplayName(user.name, user.role, user.email),
            image: user.image,
            email: user.email,
            bio: user.bio,
            assetCount: g._count._all,
            totalDownloads: g._sum.downloads ?? 0,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);
    } catch (err) {
      console.error("[home/FeaturedCreators] fetch failed:", err);
      return [];
    }
  },
  ["home-featured-creators"],
  { tags: ["assets"], revalidate: 300 }
);

export async function FeaturedCreators() {
  const creators = await fetchFeaturedCreators();
  if (creators.length === 0) return null;

  return (
    <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-muted border border-accent/20 text-xs font-medium text-accent-light mb-4">
          <Users className="w-3.5 h-3.5" />
          Featured creators
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
          The people behind the work
        </h2>
        <p className="mt-3 text-sm sm:text-base text-secondary">
          The most prolific creators shipping on Designzo right now.
        </p>
      </div>

      <div className="scroll-row scroll-row--wide scroll-row--cols-3-at-md">
        {creators.map((c) => (
          <Link
            key={c.id}
            href={`/explore?q=${encodeURIComponent(c.displayName)}`}
            className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:border-accent/40 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgba(124,58,237,0.35)]"
          >
            {/* Soft ambient glow tucked in the corner — premium touch */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-accent/15 blur-3xl opacity-60 group-hover:opacity-100 transition-opacity"
            />

            <div className="relative flex items-center gap-4">
              <Avatar
                src={c.image}
                name={c.displayName ?? c.email}
                size={56}
              />
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-primary truncate group-hover:text-accent-light transition-colors">
                  {c.displayName}
                </div>
                {c.bio && (
                  <div className="text-xs text-muted line-clamp-2 mt-0.5 leading-snug">
                    {c.bio}
                  </div>
                )}
              </div>
            </div>

            {/* Stats — uploaded count + lifetime downloads */}
            <div className="relative mt-6 pt-5 border-t border-border grid grid-cols-2 gap-4">
              <div>
                <div className="text-lg font-bold text-primary tabular-nums">
                  {formatNumber(c.assetCount)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted mt-0.5">
                  Assets shipped
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-primary tabular-nums">
                  {formatNumber(c.totalDownloads)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted mt-0.5">
                  Total downloads
                </div>
              </div>
            </div>

            <div className="relative mt-5 inline-flex items-center gap-1 text-xs font-medium text-accent-light">
              See their work
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
