import Link from "next/link";
import { Building2, AlertCircle, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { maskBankAccount } from "@/lib/kyc";
import { PayoutActions } from "./PayoutActions";
import { CreatePayoutButton } from "./CreatePayoutButton";
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

  const [payouts, payableCreators] = await Promise.all([
    prisma.payout.findMany({
      where: filter === "ALL" ? {} : { status: filter as PayoutStatus },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            // Bank fields admin needs to actually send the money for manual payouts
            bankAccountName: true,
            bankName: true,
            bankAccount: true,
            bankIfsc: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    // Creators sitting on an un-withdrawn balance — the admin can start a
    // payout for them directly. A balance > 0 means no payout is in flight
    // (creating one drains the balance to 0).
    prisma.user.findMany({
      where: { balance: { gt: 0 } },
      select: { id: true, name: true, email: true, balance: true },
      orderBy: { balance: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Payouts
        </h1>
        <p className="text-sm text-muted mt-1">
          Review and process creator payout requests. For manual payouts:
          send the amount to the creator&apos;s bank, then mark the row
          paid with the transaction reference (UTR / IMPS ref).
        </p>
      </header>

      {/* Admin-initiated payouts — pay a creator without waiting for a request */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-accent-light" />
          <h2 className="text-sm font-semibold text-primary">
            Pay a creator
          </h2>
        </div>
        <p className="text-xs text-muted mb-4">
          Creators with an un-withdrawn balance. Start a payout to move their
          balance into the queue below, then process it.
        </p>
        {payableCreators.length === 0 ? (
          <p className="text-xs text-muted">
            No creators have a withdrawable balance right now.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {payableCreators.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-primary truncate max-w-[220px]">
                    {c.name ?? "—"}
                  </div>
                  <div className="text-xs text-muted truncate max-w-[220px]">
                    {c.email}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-primary">
                    {formatPrice(c.balance)}
                  </span>
                  <CreatePayoutButton
                    creatorId={c.id}
                    amountLabel={formatPrice(c.balance)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

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
                <th className="text-left font-medium px-4 py-3">Send to</th>
                <th className="text-left font-medium px-4 py-3">Amount</th>
                <th className="text-left font-medium px-4 py-3">Requested</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payouts.map((p) => {
                const hasBank =
                  !!p.creator.bankAccount && !!p.creator.bankIfsc;
                const isOpen = p.status === "PENDING" || p.status === "PROCESSING";
                return (
                  <tr key={p.id} className="hover:bg-elevated/50 align-top">
                    <td className="px-4 py-3 text-secondary">
                      <div className="font-medium text-primary truncate max-w-[200px]">
                        {p.creator.name ?? "—"}
                      </div>
                      <div className="text-xs text-muted truncate max-w-[200px]">
                        {p.creator.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {hasBank ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-primary font-medium">
                            <Building2 className="w-3 h-3 text-muted" />
                            {p.creator.bankName ?? "Bank"}
                          </div>
                          <div className="text-secondary">
                            {p.creator.bankAccountName ?? "—"}
                          </div>
                          <div className="font-mono text-muted">
                            {maskBankAccount(p.creator.bankAccount)}
                          </div>
                          <div className="font-mono text-muted">
                            IFSC: {p.creator.bankIfsc}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-danger">
                          <AlertCircle className="w-3.5 h-3.5" />
                          KYC incomplete
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary whitespace-nowrap">
                      {formatPrice(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(p.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${STATUS_BADGE[p.status]}`}
                        >
                          {p.status}
                        </span>
                        {p.status === "PAID" && p.transactionRef && (
                          <div className="text-[10px] font-mono text-muted">
                            Ref: {p.transactionRef}
                          </div>
                        )}
                        {p.status === "FAILED" && p.failureReason && (
                          <div className="text-[10px] text-danger max-w-[160px]">
                            {p.failureReason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PayoutActions
                        payoutId={p.id}
                        status={p.status}
                        canPay={hasBank || !isOpen}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
