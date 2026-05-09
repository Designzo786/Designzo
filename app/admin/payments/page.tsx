import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { PayoutActions } from "./PayoutActions";
import type { PayoutStatus } from "@prisma/client";

const TABS: { value: PayoutStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "ALL", label: "All" },
];

const STATUS_BADGE: Record<PayoutStatus, string> = {
  PENDING: "text-gold bg-gold-muted border-gold/20",
  PROCESSING: "text-info bg-info-muted border-info/20",
  PAID: "text-accent-light bg-accent-muted border-accent/20",
  FAILED: "text-danger bg-danger-muted border-danger/20",
};

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = (
    status && ["PENDING", "PROCESSING", "PAID", "FAILED"].includes(status)
      ? status
      : "PENDING"
  ) as PayoutStatus | "ALL";

  const payouts = await prisma.payout.findMany({
    where: filter === "ALL" ? {} : { status: filter as PayoutStatus },
    include: {
      creator: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Payouts
        </h1>
        <p className="text-sm text-muted mt-1">
          Review and process creator payout requests.
        </p>
      </header>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = filter === t.value;
          return (
            <Link
              key={t.value}
              href={
                t.value === "PENDING"
                  ? "/admin/payments"
                  : `/admin/payments?status=${t.value}`
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

      {payouts.length === 0 ? (
        <div className="rounded-xl border border-border border-dashed bg-surface/50 p-12 text-center text-sm text-muted">
          No payouts in this queue.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="text-left font-medium px-4 py-3">Creator</th>
                <th className="text-left font-medium px-4 py-3">Amount</th>
                <th className="text-left font-medium px-4 py-3">Requested</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-elevated/50">
                  <td className="px-4 py-3 text-secondary">
                    <div className="font-medium text-primary truncate max-w-[200px]">
                      {p.creator.name ?? "—"}
                    </div>
                    <div className="text-xs text-muted truncate max-w-[200px]">
                      {p.creator.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-primary">
                    {formatPrice(p.amount)}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(p.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${STATUS_BADGE[p.status]}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PayoutActions payoutId={p.id} status={p.status} />
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
