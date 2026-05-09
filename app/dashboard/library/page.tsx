import Link from "next/link";
import { Library, Download, Receipt, CheckCircle2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice, formatDate } from "@/lib/utils";

export const metadata = { title: "My Library" };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ purchased?: string }>;
}) {
  const session = await auth();
  if (!session) return null;

  const { purchased } = await searchParams;

  const purchases = await prisma.purchase.findMany({
    where: {
      buyerId: session.user.id,
      status: "COMPLETED",
    },
    include: {
      asset: {
        select: {
          id: true,
          title: true,
          previewKey: true,
          fileType: true,
          uploader: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Highlight the freshly-purchased one if we just came from checkout
  const justPurchased = purchased
    ? purchases.find((p) => p.assetId === purchased)
    : undefined;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          My Library
        </h1>
        <p className="text-sm text-muted mt-1">
          {purchases.length === 0
            ? "Every asset you buy or claim shows up here, ready to download."
            : `${purchases.length} asset${purchases.length === 1 ? "" : "s"} in your library.`}
        </p>
      </header>

      {justPurchased && (
        <div className="rounded-xl border border-info/20 bg-info-muted p-4 flex items-start gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-info shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-primary">
              Purchase complete
            </div>
            <div className="text-xs text-secondary mt-0.5">
              <span className="text-primary">{justPurchased.asset.title}</span>{" "}
              has been added to your library. Click Download below to grab it.
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted">
              <Receipt className="w-3 h-3" />
              License key:{" "}
              <code className="font-mono text-secondary bg-canvas px-1.5 py-0.5 rounded">
                {justPurchased.licenseKey}
              </code>
            </div>
          </div>
        </div>
      )}

      {purchases.length === 0 ? (
        <EmptyState
          icon={Library}
          title="Your library is empty"
          description="Browse the marketplace to find your first asset. Free downloads and paid purchases both land here."
          cta={{ href: "/explore", label: "Browse marketplace" }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {purchases.map((p) => (
            <article
              key={p.id}
              className="rounded-xl border border-border bg-surface overflow-hidden flex flex-col"
            >
              <Link
                href={`/explore/${p.asset.id}`}
                className="block aspect-[4/3] bg-elevated relative overflow-hidden group"
              >
                {p.asset.previewKey ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.asset.previewKey}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted text-xs">
                    No preview
                  </div>
                )}
                {p.amount === 0 && (
                  <div className="absolute top-2 left-2 badge badge-free pointer-events-none">
                    Free
                  </div>
                )}
              </Link>

              <div className="p-4 flex-1 flex flex-col">
                <Link href={`/explore/${p.asset.id}`}>
                  <h3 className="font-semibold text-primary hover:text-accent-light transition-colors text-sm truncate">
                    {p.asset.title}
                  </h3>
                </Link>
                <p className="text-xs text-muted mt-0.5 truncate">
                  by {p.asset.uploader.name ?? "Unknown"}
                </p>

                <div className="mt-3 pt-3 border-t border-border text-xs text-muted space-y-1">
                  <div className="flex justify-between">
                    <span>Acquired</span>
                    <span className="text-secondary">
                      {formatDate(p.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid</span>
                    <span className="text-secondary">
                      {formatPrice(p.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>License</span>
                    <code className="font-mono text-secondary text-[10px] truncate max-w-[100px]">
                      {p.licenseKey}
                    </code>
                  </div>
                </div>

                <a
                  href={`/api/assets/${p.asset.id}/download`}
                  className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white gradient-accent shadow-[0_0_18px_rgba(124,58,237,0.25)] hover:shadow-[0_0_24px_rgba(124,58,237,0.4)] transition-shadow"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
