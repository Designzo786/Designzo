import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AssetThumb } from "@/components/assets/AssetThumb";
import { formatPrice } from "@/lib/utils";
import { AssetActions } from "./AssetActions";
import type { AssetStatus } from "@prisma/client";

const TABS: { value: AssetStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  // Sits between Approved + Rejected — admin sent the asset back to the
  // creator for revisions, not a hard no.
  { value: "NEEDS_IMPROVEMENT", label: "Needs improvement" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

const STATUS_BADGE: Record<AssetStatus, string> = {
  PENDING: "text-gold bg-gold-muted border-gold/20",
  APPROVED: "text-accent-light bg-accent-muted border-accent/20",
  REJECTED: "text-danger bg-danger-muted border-danger/20",
  // Amber/gold, similar to PENDING — it's also a "waiting on creator
  // action" state, not a terminal one.
  NEEDS_IMPROVEMENT: "text-gold bg-gold-muted border-gold/20",
};

export default async function AdminAssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = (
    status &&
    ["PENDING", "APPROVED", "REJECTED", "NEEDS_IMPROVEMENT", "ALL"].includes(
      status
    )
      ? status
      : "PENDING"
  ) as AssetStatus | "ALL";

  const assets = await prisma.asset.findMany({
    where: filter === "ALL" ? {} : { status: filter as AssetStatus },
    include: {
      uploader: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Asset Moderation
        </h1>
        <p className="text-sm text-muted mt-1">
          Review and approve creator submissions.
        </p>
      </header>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = filter === t.value;
          return (
            <Link
              key={t.value}
              href={t.value === "PENDING" ? "/admin/assets" : `/admin/assets?status=${t.value}`}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? "text-primary border-accent"
                  : "text-muted border-transparent hover:text-secondary"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {assets.length === 0 ? (
        <div className="rounded-xl border border-border border-dashed bg-surface/50 p-12 text-center text-sm text-muted">
          No assets in this queue.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full min-w-225 text-sm">
            <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Asset</th>
                <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Uploader</th>
                <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Price</th>
                <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Status</th>
                <th className="text-right font-medium px-4 py-3 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.map((a) => (
                <tr key={a.id} className="hover:bg-elevated/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Preview thumbnail — links through to the public
                          asset page so admins can review in full before
                          approving or rejecting. previewKey already stores
                          a fully-qualified URL (R2 public or /uploads/...
                          in local dev), so it's used as-is. */}
                      <Link
                        href={`/explore/${a.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 group"
                        title="Open asset in new tab"
                      >
                        <AssetThumb
                          src={a.previewKey}
                          alt={a.title}
                          className="w-20 h-14 rounded-lg group-hover:ring-accent transition-shadow"
                        />
                      </Link>
                      <div className="min-w-0">
                        <div className="font-medium text-primary truncate max-w-65">
                          {a.title}
                        </div>
                        <div className="text-xs text-muted">
                          {a.category} · {a.fileType}
                        </div>
                        {a.status === "REJECTED" && a.rejectionNote && (
                          <div className="text-xs text-danger truncate max-w-65 mt-0.5">
                            {a.rejectionNote}
                          </div>
                        )}
                        {a.status === "NEEDS_IMPROVEMENT" &&
                          a.rejectionNote && (
                            <div className="text-xs text-gold truncate max-w-65 mt-0.5">
                              {a.rejectionNote}
                            </div>
                          )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    <div className="truncate max-w-45">{a.uploader.name ?? "—"}</div>
                    <div className="text-xs text-muted truncate max-w-45">{a.uploader.email}</div>
                  </td>
                  <td className="px-4 py-3 text-secondary whitespace-nowrap">
                    {formatPrice(a.price)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border whitespace-nowrap ${STATUS_BADGE[a.status]}`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AssetActions assetId={a.id} status={a.status} />
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
