import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatRelativeTime } from "@/lib/utils";
import { PurchaseActions } from "./PurchaseActions";
import type { PurchaseStatus } from "@prisma/client";

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
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = (
    status && ["COMPLETED", "PENDING", "REFUNDED"].includes(status)
      ? status
      : "COMPLETED"
  ) as PurchaseStatus | "ALL";

  const purchases = await prisma.purchase.findMany({
    where: filter === "ALL" ? {} : { status: filter as PurchaseStatus },
    include: {
      buyer: { select: { name: true, email: true } },
      asset: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

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
