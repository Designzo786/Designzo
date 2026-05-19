import Link from "next/link";
import { redirect } from "next/navigation";
import { Upload, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice, formatRelativeTime } from "@/lib/utils";
import type { AssetStatus } from "@prisma/client";

export const metadata = { title: "My Assets" };

const STATUS_BADGE: Record<AssetStatus, string> = {
  PENDING: "text-gold bg-gold-muted border-gold/20",
  APPROVED: "text-accent-light bg-accent-muted border-accent/20",
  REJECTED: "text-danger bg-danger-muted border-danger/20",
};

export default async function UploadsPage() {
  const session = await auth();
  if (!session) return null;
  // Buy-only USER accounts don't have an asset workspace.
  if (session.user.role === "USER") redirect("/dashboard/library");

  const assets = await prisma.asset.findMany({
    where: { uploaderId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      previewKey: true,
      price: true,
      status: true,
      downloads: true,
      rejectionNote: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            My Assets
          </h1>
          <p className="text-sm text-muted mt-1">
            {assets.length === 0
              ? "You haven't uploaded any assets yet."
              : `${assets.length} asset${assets.length === 1 ? "" : "s"} uploaded.`}
          </p>
        </div>
        <Link
          href="/dashboard/uploads/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white gradient-accent shadow-[0_0_24px_rgba(124,58,237,0.25)] hover:shadow-[0_0_36px_rgba(124,58,237,0.4)] transition-all"
        >
          <Plus className="w-4 h-4" />
          Upload asset
        </Link>
      </header>

      {assets.length === 0 ? (
        <EmptyState
          icon={Upload}
          title="No assets yet"
          description="Upload your first asset — it will be reviewed by an admin and then appear in the marketplace."
          cta={{ href: "/dashboard/uploads/new", label: "Upload your first asset" }}
        />
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="text-left font-medium px-4 py-3">Asset</th>
                <th className="text-left font-medium px-4 py-3">Price</th>
                <th className="text-left font-medium px-4 py-3">Downloads</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.map((a) => (
                <tr key={a.id} className="hover:bg-elevated/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {a.previewKey ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.previewKey}
                          alt=""
                          className="w-12 h-12 rounded-md object-cover bg-canvas shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-canvas shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-primary truncate max-w-[260px]">
                          {a.title}
                        </div>
                        {a.status === "REJECTED" && a.rejectionNote && (
                          <div className="text-xs text-danger truncate max-w-[260px] mt-0.5">
                            {a.rejectionNote}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    {formatPrice(a.price)}
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    {a.downloads.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${STATUS_BADGE[a.status]}`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                    {formatRelativeTime(a.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
