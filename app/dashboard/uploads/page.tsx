import Link from "next/link";
import { redirect } from "next/navigation";
import { Upload, Plus, ImageOff } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice, formatRelativeTime } from "@/lib/utils";
import { DeleteAssetButton } from "./DeleteAssetButton";
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
          <div className="overflow-x-auto"><table className="w-full min-w-160 text-sm">
            <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="text-left font-medium px-4 py-3">Asset</th>
                <th className="text-left font-medium px-4 py-3">Price</th>
                <th className="text-left font-medium px-4 py-3">Downloads</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Uploaded</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.map((a) => (
                <tr key={a.id} className="hover:bg-elevated/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {a.previewKey ? (
                        // Public preview URL is stored directly in previewKey
                        // (R2 public URL or `/uploads/...` in local dev), so
                        // it can be used as <img src> unmodified. Plain <img>
                        // intentional — Next/Image needs domain config and
                        // these are already small CDN-served thumbnails.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.previewKey}
                          alt={a.title}
                          loading="lazy"
                          className="w-20 h-14 rounded-lg object-cover bg-canvas shrink-0 ring-1 ring-border"
                        />
                      ) : (
                        <div className="w-20 h-14 rounded-lg bg-canvas shrink-0 ring-1 ring-border flex items-center justify-center text-subtle">
                          <ImageOff className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-primary truncate max-w-65">
                          {a.title}
                        </div>
                        {a.status === "REJECTED" && a.rejectionNote && (
                          <div className="text-xs text-danger truncate max-w-65 mt-0.5">
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
                  <td className="px-4 py-3 text-right">
                    <DeleteAssetButton assetId={a.id} title={a.title} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
