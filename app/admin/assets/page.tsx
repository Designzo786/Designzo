import Link from "next/link";
import { ImageOff } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { AssetActions } from "./AssetActions";
import type { AssetStatus } from "@prisma/client";

const TABS: { value: AssetStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

const STATUS_BADGE: Record<AssetStatus, string> = {
  PENDING: "text-gold bg-gold-muted border-gold/20",
  APPROVED: "text-accent-light bg-accent-muted border-accent/20",
  REJECTED: "text-danger bg-danger-muted border-danger/20",
};

export default async function AdminAssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = (
    status && ["PENDING", "APPROVED", "REJECTED"].includes(status)
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
          <table className="w-full text-sm">
            <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="text-left font-medium px-4 py-3">Asset</th>
                <th className="text-left font-medium px-4 py-3">Uploader</th>
                <th className="text-left font-medium px-4 py-3">Price</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
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
                        {a.previewKey ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.previewKey}
                            alt={a.title}
                            loading="lazy"
                            className="w-20 h-14 rounded-lg object-cover bg-canvas ring-1 ring-border group-hover:ring-accent transition-shadow"
                          />
                        ) : (
                          <div className="w-20 h-14 rounded-lg bg-canvas ring-1 ring-border group-hover:ring-accent transition-shadow flex items-center justify-center text-subtle">
                            <ImageOff className="w-5 h-5" />
                          </div>
                        )}
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
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    <div className="truncate max-w-45">{a.uploader.name ?? "—"}</div>
                    <div className="text-xs text-muted truncate max-w-45">{a.uploader.email}</div>
                  </td>
                  <td className="px-4 py-3 text-secondary">{formatPrice(a.price)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${STATUS_BADGE[a.status]}`}
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
          </table>
        </div>
      )}
    </div>
  );
}
