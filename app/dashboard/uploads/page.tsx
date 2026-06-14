import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Upload,
  Plus,
  Box,
  Sparkles,
  Layers,
  FileBox,
  ExternalLink,
  Download,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/EmptyState";
import { AssetThumb } from "@/components/assets/AssetThumb";
import { formatPrice, formatRelativeTime } from "@/lib/utils";
import {
  CATEGORIES,
  subcategoryName,
  FILE_TYPES,
} from "@/lib/mock/assets";
import { DeleteAssetButton } from "./DeleteAssetButton";
import { CopyLinkButton } from "./CopyLinkButton";
import type { AssetStatus } from "@prisma/client";

export const metadata = { title: "My Assets" };

const STATUS_BADGE: Record<AssetStatus, string> = {
  PENDING: "text-gold bg-gold-muted border-gold/20",
  APPROVED: "text-accent-light bg-accent-muted border-accent/20",
  REJECTED: "text-danger bg-danger-muted border-danger/20",
  // Same gold as PENDING — both states are "waiting on creator/admin"
  // and amber reads as "action required" without the harshness of red.
  NEEDS_IMPROVEMENT: "text-gold bg-gold-muted border-gold/20",
};

// Status label shown on the badge — "NEEDS_IMPROVEMENT" is a mouthful
// and "Needs Work" reads better at small caps.
const STATUS_LABEL: Record<AssetStatus, string> = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  NEEDS_IMPROVEMENT: "NEEDS WORK",
};

// Per-file-type icon + tone for the "Type" column. Same hue mapping the
// home-page category tiles use so a creator's mental model stays
// consistent across the marketplace.
const TYPE_META: Record<string, { icon: LucideIcon; tone: string; label: string }> = {
  MODEL_3D: {
    icon: Box,
    tone: "text-violet-300 bg-violet-500/15 border-violet-400/30",
    label: "3D Model",
  },
  LOTTIE: {
    icon: Sparkles,
    tone: "text-pink-300 bg-pink-500/15 border-pink-400/30",
    label: "Lottie",
  },
  SVG_ICON: {
    icon: Layers,
    tone: "text-emerald-300 bg-emerald-500/15 border-emerald-400/30",
    label: "SVG Icon",
  },
};

const FILTERS = [
  { value: "ALL", label: "All" },
  { value: "APPROVED", label: "Approved" },
  { value: "PENDING", label: "Pending" },
  { value: "NEEDS_IMPROVEMENT", label: "Needs work" },
  { value: "REJECTED", label: "Rejected" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

export default async function UploadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  if (session.user.role === "USER") redirect("/dashboard/library");

  const { status: rawStatus } = await searchParams;
  const activeFilter: FilterValue = (
    FILTERS.find((f) => f.value === rawStatus)?.value ?? "ALL"
  ) as FilterValue;

  // Pull everything in parallel: the (filtered) list of assets the
  // table renders, plus a full status breakdown for the filter chips.
  // `groupBy` is one query that returns one row per status so we don't
  // need three count() calls.
  const [assets, statusGroups] = await Promise.all([
    prisma.asset.findMany({
      where: {
        uploaderId: session.user.id,
        ...(activeFilter !== "ALL"
          ? { status: activeFilter as AssetStatus }
          : {}),
      },
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
        category: true,
        subcategory: true,
        fileType: true,
      },
    }),
    prisma.asset.groupBy({
      by: ["status"],
      where: { uploaderId: session.user.id },
      _count: { _all: true },
    }),
  ]);

  // Build a quick lookup so the filter strip can show "Approved (3)".
  const statusCounts: Record<string, number> = { ALL: 0 };
  for (const g of statusGroups) {
    statusCounts[g.status] = g._count._all;
    statusCounts.ALL += g._count._all;
  }

  const totalAssets = statusCounts.ALL;
  const isEmptyOverall = totalAssets === 0;
  const isEmptyFiltered = assets.length === 0 && !isEmptyOverall;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            My Assets
          </h1>
          <p className="text-sm text-muted mt-1">
            {isEmptyOverall
              ? "You haven't uploaded any assets yet."
              : `${totalAssets} asset${totalAssets === 1 ? "" : "s"} uploaded.`}
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

      {/* ─── Status filter strip ──────────────────────────────────────
          Only renders when the creator has at least one upload — no
          empty filter row on a fresh account. Each chip shows its live
          count so the creator can see at a glance "I have 2 pending
          and 1 rejected" without opening each tab. */}
      {!isEmptyOverall && (
        <div className="flex flex-wrap gap-1 border-b border-border">
          {FILTERS.map((f) => {
            const active = activeFilter === f.value;
            const count = statusCounts[f.value] ?? 0;
            return (
              <Link
                key={f.value}
                href={
                  f.value === "ALL"
                    ? "/dashboard/uploads"
                    : `/dashboard/uploads?status=${f.value}`
                }
                className={`px-4 py-2.5 inline-flex items-center gap-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  active
                    ? "text-primary border-accent"
                    : "text-muted border-transparent hover:text-secondary"
                }`}
              >
                {f.label}
                <span
                  className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-semibold tabular-nums ${
                    active
                      ? "bg-accent text-white"
                      : "bg-elevated text-muted border border-border"
                  }`}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {isEmptyOverall ? (
        <EmptyState
          icon={Upload}
          title="No assets yet"
          description="Upload your first asset — it will be reviewed by an admin and then appear in the marketplace."
          cta={{ href: "/dashboard/uploads/new", label: "Upload your first asset" }}
        />
      ) : isEmptyFiltered ? (
        <div className="rounded-xl border border-border border-dashed bg-surface/50 p-12 text-center text-sm text-muted">
          No assets match this filter.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 text-sm">
              <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Asset</th>
                  <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Type</th>
                  <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Price</th>
                  <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Downloads</th>
                  <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Uploaded</th>
                  <th className="text-right font-medium px-4 py-3 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assets.map((a) => {
                  const categoryName =
                    CATEGORIES.find((c) => c.slug === a.category)?.name ??
                    a.category;
                  const subName = subcategoryName(a.category, a.subcategory);
                  const typeMeta =
                    TYPE_META[a.fileType] ?? {
                      icon: FileBox,
                      tone: "text-muted bg-elevated border-border",
                      label:
                        FILE_TYPES.find((t) => t.slug === a.fileType)?.name ??
                        a.fileType,
                    };
                  const TypeIcon = typeMeta.icon;
                  return (
                    <tr key={a.id} className="hover:bg-elevated/50">
                      <td className="px-4 py-3">
                        {/* The whole asset cell is a link to the public
                            detail page so the creator can preview their
                            own listing in one tap — including PENDING
                            uploads (the uploader is always allowed to
                            view their own asset, even before approval). */}
                        <Link
                          href={`/explore/${a.id}`}
                          className="group flex items-center gap-3 min-w-0"
                        >
                          <AssetThumb
                            src={a.previewKey}
                            alt={a.title}
                            className="w-20 h-14 rounded-lg shrink-0 group-hover:ring-accent transition-shadow"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-primary truncate max-w-65 group-hover:text-accent-light transition-colors">
                              {a.title}
                            </div>
                            {/* Category + sub-category meta line so the
                                creator can scan their table for what kind
                                of asset each row actually is. */}
                            <div className="text-xs text-muted truncate max-w-65 mt-0.5">
                              {categoryName}
                              {subName ? ` · ${subName}` : ""}
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
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border whitespace-nowrap ${typeMeta.tone}`}
                        >
                          <TypeIcon className="w-3.5 h-3.5" />
                          {typeMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-secondary tabular-nums whitespace-nowrap">
                        {formatPrice(a.price)}
                      </td>
                      <td className="px-4 py-3 text-secondary tabular-nums whitespace-nowrap">
                        {a.downloads.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border whitespace-nowrap ${STATUS_BADGE[a.status]}`}
                        >
                          {STATUS_LABEL[a.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                        {formatRelativeTime(a.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {/* Manage toolkit — four icon-only buttons sharing
                            the same w-8 h-8 footprint so the column reads
                            as one grouped control rather than a mismatched
                            row. Open / Edit / Re-download in neutral grey
                            with an accent hover; Delete in neutral grey
                            with a red hover to keep destructive intent
                            obvious without shouting at the creator on
                            every scan. */}
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/explore/${a.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open public listing in a new tab"
                            aria-label={`Open ${a.title}`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted hover:text-accent-light hover:bg-elevated border border-border hover:border-accent/40 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <CopyLinkButton assetId={a.id} title={a.title} />
                          <Link
                            href={`/dashboard/uploads/${a.id}/edit`}
                            title="Edit title, price, category or tags"
                            aria-label={`Edit ${a.title}`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted hover:text-accent-light hover:bg-elevated border border-border hover:border-accent/40 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <a
                            href={`/api/assets/${a.id}/download`}
                            title="Re-download your source file"
                            aria-label={`Download ${a.title}`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted hover:text-accent-light hover:bg-elevated border border-border hover:border-accent/40 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <DeleteAssetButton assetId={a.id} title={a.title} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
