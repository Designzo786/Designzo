import Link from "next/link";
import {
  Banknote,
  Receipt,
  Wallet,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatRelativeTime, formatMoney } from "@/lib/utils";
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
  searchParams: Promise<{ status?: string; period?: string }>;
}) {
  const { status, period: rawPeriod } = await searchParams;
  const filter = (
    status && ["COMPLETED", "PENDING", "REFUNDED"].includes(status)
      ? status
      : "COMPLETED"
  ) as PurchaseStatus | "ALL";

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

  // Summary cards always reflect COMPLETED (the "real money" rows) —
  // PENDING / REFUNDED would muddy the totals. The aggregate query is
  // separate from the table fetch so the table tabs can show a different
  // status without changing what the cards mean.
  const [purchases, salesAgg] = await Promise.all([
    prisma.purchase.findMany({
      where: filter === "ALL" ? {} : { status: filter as PurchaseStatus },
      include: {
        buyer: { select: { name: true, email: true } },
        asset: { select: { title: true } },
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
  ]);

  const gross = salesAgg._sum.amount ?? 0;
  const platformEarned = salesAgg._sum.platformFee ?? 0;
  const creatorPaid = salesAgg._sum.creatorEarning ?? 0;
  const salesCount = salesAgg._count._all;

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
