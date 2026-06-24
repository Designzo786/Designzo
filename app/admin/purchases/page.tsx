import Link from "next/link";
import {
  Banknote,
  Receipt,
  Wallet,
  ShoppingCart,
  Download as DownloadIcon,
  Search,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  formatPrice,
  formatRelativeTime,
  formatMoney,
  creatorDisplayName,
} from "@/lib/utils";
import { PurchaseActions } from "./PurchaseActions";
import type { PurchaseStatus } from "@prisma/client";

// Period filter for the summary cards. `null` = lifetime — no createdAt
// constraint applied to the aggregate.
const PERIODS = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "all", label: "All time", days: null },
] as const;

type PeriodValue = (typeof PERIODS)[number]["value"];

const TABS: { value: PurchaseStatus | "ALL"; label: string }[] = [
  { value: "COMPLETED", label: "Paid" },
  { value: "PENDING", label: "Pending" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "ALL", label: "All" },
];

const STATUS_BADGE: Record<PurchaseStatus, string> = {
  COMPLETED: "text-accent-light bg-accent-muted border-accent/20",
  PENDING: "text-gold bg-gold-muted border-gold/20",
  REFUNDED: "text-danger bg-danger-muted border-danger/20",
};

const STATUS_LABEL: Record<PurchaseStatus, string> = {
  COMPLETED: "Paid",
  PENDING: "Pending",
  REFUNDED: "Refunded",
};

export default async function AdminPurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    period?: string;
    q?: string;
  }>;
}) {
  const { status, period: rawPeriod, q: rawQ } = await searchParams;
  const filter = (
    status && ["COMPLETED", "PENDING", "REFUNDED"].includes(status)
      ? status
      : "COMPLETED"
  ) as PurchaseStatus | "ALL";

  // Free-text search across buyer email/name + asset title. Used in
  // the table query only — the summary cards stay untouched so the
  // operator sees the absolute totals while drilling in.
  const q = (rawQ ?? "").trim().slice(0, 80);

  const period: PeriodValue =
    PERIODS.find((p) => p.value === rawPeriod)?.value ?? "30d";
  const periodDays = PERIODS.find((p) => p.value === period)?.days ?? null;

  // This is a server component — Date.now is the intended source of
  // "right now" at request boundary; React's purity rule about render
  // re-execution doesn't apply.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const periodCutoff =
    periodDays === null ? null : new Date(now - periodDays * 24 * 60 * 60 * 1000);

  // Common WHERE for table queries — adds the optional q search.
  const tableWhere = {
    ...(filter === "ALL" ? {} : { status: filter as PurchaseStatus }),
    ...(q
      ? {
          OR: [
            { buyer: { email: { contains: q, mode: "insensitive" as const } } },
            { buyer: { name: { contains: q, mode: "insensitive" as const } } },
            { asset: { title: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  // Summary cards always reflect COMPLETED (the "real money" rows) —
  // PENDING / REFUNDED would muddy the totals. The aggregate query is
  // separate from the table fetch so the table tabs can show a different
  // status without changing what the cards mean.
  const [purchases, salesAgg, topAssets, topCreators] = await Promise.all([
    prisma.purchase.findMany({
      where: tableWhere,
      include: {
        buyer: { select: { name: true, email: true } },
        asset: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    prisma.purchase.aggregate({
      where: {
        status: "COMPLETED",
        ...(periodCutoff ? { createdAt: { gte: periodCutoff } } : {}),
      },
      _sum: {
        amount: true,
        platformFee: true,
        creatorEarning: true,
      },
      _count: { _all: true },
    }),
    // Top 5 best-selling assets (by gross) in the same period as the
    // summary cards. groupBy on assetId is one indexed scan — cheap.
    prisma.purchase.groupBy({
      by: ["assetId"],
      where: {
        status: "COMPLETED",
        ...(periodCutoff ? { createdAt: { gte: periodCutoff } } : {}),
      },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    // Top 5 creators by earning in the same period. groupBy can't
    // join across the relation in one query, so we drop to raw SQL —
    // a single indexed scan + small in-memory sort.
    prisma.$queryRaw<
      Array<{
        uploaderId: string;
        name: string | null;
        email: string;
        role: "USER" | "CREATOR" | "ADMIN";
        creator_earned: bigint;
        sale_count: bigint;
      }>
    >`
      SELECT
        a."uploaderId" AS "uploaderId",
        u."name" AS name,
        u."email" AS email,
        u."role" AS role,
        SUM(p."creatorEarning")::bigint AS creator_earned,
        COUNT(*)::bigint AS sale_count
      FROM "Purchase" p
      JOIN "Asset" a ON a."id" = p."assetId"
      JOIN "User" u ON u."id" = a."uploaderId"
      WHERE p."status" = 'COMPLETED'
        ${
          periodCutoff
            ? Prisma.sql`AND p."createdAt" >= ${periodCutoff}`
            : Prisma.empty
        }
      GROUP BY a."uploaderId", u."name", u."email", u."role"
      ORDER BY creator_earned DESC
      LIMIT 5
    `,
  ]);

  const gross = salesAgg._sum.amount ?? 0;
  const platformEarned = salesAgg._sum.platformFee ?? 0;
  const creatorPaid = salesAgg._sum.creatorEarning ?? 0;
  const salesCount = salesAgg._count._all;

  // Resolve the top-asset ids to their titles + cover so the panel
  // can render rich rows. Single query — cheaper than N follow-ups.
  const topAssetIds = topAssets.map((a) => a.assetId);
  const topAssetDetails =
    topAssetIds.length > 0
      ? await prisma.asset.findMany({
          where: { id: { in: topAssetIds } },
          select: {
            id: true,
            title: true,
            previewKey: true,
            category: true,
          },
        })
      : [];
  const topAssetById = new Map(topAssetDetails.map((a) => [a.id, a]));

  // Build the CSV export URL with the current period + filter
  // selections so the operator can download exactly what they're
  // looking at.
  const csvUrl =
    `/api/admin/purchases/export?status=${filter === "ALL" ? "COMPLETED" : filter}` +
    `&period=${period}`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Purchases
        </h1>
        <p className="text-sm text-muted mt-1">
          Every user payment. Mark a purchase paid or not paid — confirming a
          payment grants the buyer access and credits the creator; un-marking
          it removes access and reverses the credit.
        </p>
      </header>

      {/* Sales summary — sits above the per-status tabs so the headline
          numbers (gross / split / count) are the first thing the admin
          sees. The period chip row swaps the aggregate's createdAt
          window without changing the table below. */}
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-primary">
            Sales summary
          </h2>
          <div className="flex flex-wrap gap-1">
            {PERIODS.map((p) => {
              const active = period === p.value;
              return (
                <Link
                  key={p.value}
                  href={
                    p.value === "30d"
                      ? `/admin/purchases${filter !== "COMPLETED" ? `?status=${filter}` : ""}`
                      : `/admin/purchases?period=${p.value}${filter !== "COMPLETED" ? `&status=${filter}` : ""}`
                  }
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    active
                      ? "text-accent-light bg-accent-muted border-accent/30"
                      : "text-muted bg-surface border-border hover:text-primary hover:border-border-hover"
                  }`}
                >
                  {p.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            icon={Banknote}
            label="Gross revenue"
            value={formatMoney(gross)}
            sublabel="Total collected from buyers"
            accent="text-accent-light"
          />
          <SummaryCard
            icon={Receipt}
            label="Platform earnings"
            value={formatMoney(platformEarned)}
            sublabel="Your commission this period"
            accent="text-gold"
          />
          <SummaryCard
            icon={Wallet}
            label="Paid to creators"
            value={formatMoney(creatorPaid)}
            sublabel="Credited to creator balances"
            accent="text-info"
          />
          <SummaryCard
            icon={ShoppingCart}
            label="Completed sales"
            value={salesCount.toString()}
            sublabel={
              salesCount === 1 ? "purchase" : "purchases"
            }
            accent="text-primary"
          />
        </div>
      </section>

      {/* Top performers — two side-by-side leaderboards scoped to the
          same period as the summary cards. Empty (with a friendly
          fallback) when no sales landed in the window. */}
      {(topAssets.length > 0 || topCreators.length > 0) && (
        <section className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-primary mb-3 inline-flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gold" />
              Top-selling assets
            </h3>
            {topAssets.length === 0 ? (
              <div className="text-xs text-muted py-4">
                No sales in this period.
              </div>
            ) : (
              <ol className="space-y-2">
                {topAssets.map((row, i) => {
                  const a = topAssetById.get(row.assetId);
                  return (
                    <li
                      key={row.assetId}
                      className="flex items-center gap-3"
                    >
                      <span className="w-5 text-xs font-bold text-muted tabular-nums">
                        #{i + 1}
                      </span>
                      <Link
                        href={`/explore/${row.assetId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:text-accent-light transition-colors truncate flex-1 min-w-0"
                      >
                        {a?.title ?? "Untitled asset"}
                      </Link>
                      <span className="text-xs text-muted shrink-0">
                        {row._count._all} sale
                        {row._count._all === 1 ? "" : "s"}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-accent-light shrink-0">
                        {formatMoney(row._sum.amount ?? 0)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-primary mb-3 inline-flex items-center gap-2">
              <Users className="w-4 h-4 text-info" />
              Top earning creators
            </h3>
            {topCreators.length === 0 ? (
              <div className="text-xs text-muted py-4">
                No creator earnings in this period.
              </div>
            ) : (
              <ol className="space-y-2">
                {topCreators.map((row, i) => (
                  <li
                    key={row.uploaderId}
                    className="flex items-center gap-3"
                  >
                    <span className="w-5 text-xs font-bold text-muted tabular-nums">
                      #{i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-primary truncate">
                        {creatorDisplayName(row.name, row.role, row.email)}
                      </div>
                      <div className="text-[11px] text-muted truncate">
                        {row.email}
                      </div>
                    </div>
                    <span className="text-xs text-muted shrink-0">
                      {Number(row.sale_count)} sale
                      {Number(row.sale_count) === 1 ? "" : "s"}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-info shrink-0">
                      {formatMoney(Number(row.creator_earned))}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      )}

      {/* Search + Export row — search hits the table only (not the
          summary cards above), export downloads the current
          status+period combination as a UTF-8 CSV. */}
      <section className="flex items-center gap-2 flex-wrap">
        <form
          method="get"
          action="/admin/purchases"
          className="flex-1 min-w-50 relative"
        >
          {/* Preserve the current tab + period in hidden inputs so
              hitting "Search" doesn't reset them. */}
          {filter !== "COMPLETED" && (
            <input type="hidden" name="status" value={filter} />
          )}
          {period !== "30d" && (
            <input type="hidden" name="period" value={period} />
          )}
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search buyer email, name, or asset title…"
            className="w-full h-9 pl-9 pr-3 bg-surface border border-border rounded-lg text-sm text-primary placeholder:text-muted/70 focus:outline-none focus:border-border-focus transition-colors"
          />
        </form>
        <a
          href={csvUrl}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-primary bg-surface border border-border hover:border-border-hover transition-colors"
          title="Download all rows matching the current status + period as CSV"
        >
          <DownloadIcon className="w-3.5 h-3.5" />
          Export CSV
        </a>
      </section>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = filter === t.value;
          return (
            <Link
              key={t.value}
              href={
                t.value === "COMPLETED"
                  ? "/admin/purchases"
                  : `/admin/purchases?status=${t.value}`
              }
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

      {/* Per-status tabs anchor the table below. Period scope of the
          summary cards above is independent — admins can scope cards
          to "last 7 days" while still scrolling the full COMPLETED
          history in the table. */}
      {purchases.length === 0 ? (
        <div className="rounded-xl border border-border border-dashed bg-surface/50 p-12 text-center text-sm text-muted">
          No purchases in this queue.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full min-w-160 text-sm">
            <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="text-left font-medium px-4 py-3">Buyer</th>
                <th className="text-left font-medium px-4 py-3">Asset</th>
                <th className="text-left font-medium px-4 py-3">Amount</th>
                <th className="text-left font-medium px-4 py-3">Date</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-elevated/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-primary truncate max-w-[180px]">
                      {p.buyer.name ?? "—"}
                    </div>
                    <div className="text-xs text-muted truncate max-w-[180px]">
                      {p.buyer.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-secondary truncate max-w-[180px]">
                    {p.asset.title}
                  </td>
                  <td className="px-4 py-3 font-semibold text-primary whitespace-nowrap">
                    {formatPrice(p.amount)}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                    {formatRelativeTime(p.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${STATUS_BADGE[p.status]}`}
                    >
                      {STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PurchaseActions purchaseId={p.id} status={p.status} />
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

function SummaryCard({
  icon: Icon,
  label,
  value,
  sublabel,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs text-muted font-medium">{label}</span>
        <span
          className={`w-7 h-7 rounded-md bg-elevated border border-border flex items-center justify-center ${accent}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </span>
      </div>
      <div className={`text-2xl font-bold tracking-tight ${accent}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted mt-0.5">{sublabel}</div>
    </div>
  );
}
