import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DollarSign,
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatRelativeTime } from "@/lib/utils";
import { AssetThumb } from "@/components/assets/AssetThumb";
import { RequestPayoutButton } from "./RequestPayoutButton";
import type { PayoutStatus } from "@prisma/client";

export const metadata = { title: "Earnings" };

const MIN_PAYOUT_PAISE = 50000; // ₹500 — keep in sync with /api/payouts/request

const STATUS_LABEL: Record<PayoutStatus, string> = {
  PENDING: "Queued",
  PROCESSING: "Processing",
  PAID: "Paid",
  FAILED: "Failed",
};

const STATUS_BADGE: Record<PayoutStatus, string> = {
  PENDING: "text-gold bg-gold-muted border-gold/20",
  PROCESSING: "text-info bg-info-muted border-info/20",
  PAID: "text-accent-light bg-accent-muted border-accent/20",
  FAILED: "text-danger bg-danger-muted border-danger/20",
};

const STATUS_ICON: Record<PayoutStatus, typeof Clock> = {
  PENDING: Clock,
  PROCESSING: Clock,
  PAID: CheckCircle2,
  FAILED: XCircle,
};

export default async function EarningsPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/dashboard/earnings");
  // Earnings is a collaborator-only surface.
  if (session.user.role === "USER") redirect("/dashboard/library");

  // Pull everything in parallel — balance, KYC status, payout history,
  // a lifetime-earned aggregate, and the 20 most recent sales so the
  // creator can see *which* assets are selling, not just a total count.
  const [user, payouts, salesAgg, recentSales] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { balance: true, kycStatus: true },
    }),
    prisma.payout.findMany({
      where: { creatorId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        razorpayPayoutId: true,
        transactionRef: true,
        failureReason: true,
      },
    }),
    prisma.purchase.aggregate({
      where: {
        status: "COMPLETED",
        asset: { uploaderId: session.user.id },
      },
      _sum: { creatorEarning: true },
      _count: { _all: true },
    }),
    prisma.purchase.findMany({
      where: {
        status: "COMPLETED",
        asset: { uploaderId: session.user.id },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        amount: true,
        creatorEarning: true,
        createdAt: true,
        asset: {
          select: {
            id: true,
            title: true,
            previewKey: true,
          },
        },
        // Buyer email is intentionally NOT pulled — exposing buyer
        // identities to the creator is a privacy concern. We only show
        // an anonymised "Buyer #ABCD" derived from the licenseKey so the
        // creator can correlate with a support request if needed.
        licenseKey: true,
      },
    }),
  ]);

  if (!user) redirect("/login");

  const lifetimeEarned = salesAgg._sum.creatorEarning ?? 0;
  const salesCount = salesAgg._count._all;
  const canRequest =
    user.kycStatus === "VERIFIED" &&
    user.balance >= MIN_PAYOUT_PAISE &&
    !payouts.some(
      (p) => p.status === "PENDING" || p.status === "PROCESSING"
    );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Earnings
        </h1>
        <p className="text-sm text-muted mt-1">
          Track creator earnings and request bank payouts. Once approved
          you&apos;ll receive a transaction reference (UTR) by email.
        </p>
      </header>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          icon={DollarSign}
          label="Available balance"
          value={formatMoney(user.balance)}
          accent="text-accent-light"
        />
        <StatCard
          icon={Banknote}
          label="Lifetime earned"
          value={formatMoney(lifetimeEarned)}
          accent="text-primary"
        />
        <StatCard
          icon={CheckCircle2}
          label="Sales"
          value={salesCount.toString()}
          accent="text-primary"
        />
      </div>

      <PayoutPanel
        kycStatus={user.kycStatus}
        balance={user.balance}
        canRequest={canRequest}
        hasInflight={payouts.some(
          (p) => p.status === "PENDING" || p.status === "PROCESSING"
        )}
      />

      {/* Recent sales — sits above payouts because it's the "where is
          this money coming from?" answer the creator usually wants
          before they bother thinking about a withdrawal. Each row
          links straight to the asset's listing so the creator can
          jump into a top-performing piece and iterate on the variant. */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-primary">
            Recent sales
          </h2>
          {recentSales.length > 0 && (
            <span className="text-xs text-muted">
              Showing your last {recentSales.length} of {salesCount}
            </span>
          )}
        </div>

        {recentSales.length === 0 ? (
          <div className="rounded-xl border border-border border-dashed bg-surface/50 p-10 text-center text-sm text-muted">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No sales yet. Once a buyer purchases one of your approved
            assets, it shows up here with the amount you earned.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-150 text-sm">
                <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Asset</th>
                    <th className="text-left font-medium px-4 py-3 whitespace-nowrap">
                      Buyer
                    </th>
                    <th className="text-left font-medium px-4 py-3 whitespace-nowrap">
                      Sale price
                    </th>
                    <th className="text-left font-medium px-4 py-3 whitespace-nowrap">
                      You earned
                    </th>
                    <th className="text-left font-medium px-4 py-3 whitespace-nowrap">
                      When
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentSales.map((s) => {
                    // Buyer pseudonym derived from the licenseKey's tail
                    // — keeps the buyer's identity private while letting
                    // the creator correlate with a support ticket
                    // ("Hi, I bought your asset, license ending in 7A2F").
                    const buyerTag = s.licenseKey
                      .replace(/[^A-Za-z0-9]/g, "")
                      .slice(-4)
                      .toUpperCase();
                    return (
                      <tr key={s.id} className="hover:bg-elevated/50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/explore/${s.asset.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-3 min-w-0"
                          >
                            <AssetThumb
                              src={s.asset.previewKey}
                              alt={s.asset.title}
                              className="w-16 h-11 rounded-lg shrink-0 group-hover:ring-accent transition-shadow"
                            />
                            <span className="font-medium text-primary truncate max-w-55 group-hover:text-accent-light transition-colors">
                              {s.asset.title}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted text-xs font-mono whitespace-nowrap">
                          Buyer #{buyerTag}
                        </td>
                        <td className="px-4 py-3 text-secondary tabular-nums whitespace-nowrap">
                          {formatMoney(s.amount)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-accent-light tabular-nums whitespace-nowrap">
                          +{formatMoney(s.creatorEarning)}
                        </td>
                        <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                          {formatRelativeTime(s.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-primary mb-3">
          Payout history
        </h2>

        {payouts.length === 0 ? (
          <div className="rounded-xl border border-border border-dashed bg-surface/50 p-10 text-center text-sm text-muted">
            No payouts yet. Once your balance hits{" "}
            {formatMoney(MIN_PAYOUT_PAISE)}, you can request your first one.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="overflow-x-auto"><table className="w-full min-w-160 text-sm">
              <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Requested</th>
                  <th className="text-left font-medium px-4 py-3">Amount</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-left font-medium px-4 py-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payouts.map((p) => {
                  const Icon = STATUS_ICON[p.status];
                  return (
                    <tr key={p.id} className="hover:bg-elevated/50">
                      <td className="px-4 py-3 text-secondary text-xs whitespace-nowrap">
                        {formatRelativeTime(p.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary">
                        {formatMoney(p.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${STATUS_BADGE[p.status]}`}
                        >
                          <Icon className="w-3 h-3" />
                          {STATUS_LABEL[p.status]}
                        </span>
                        {p.status === "FAILED" && p.failureReason && (
                          <div className="text-[11px] text-danger mt-1">
                            {p.failureReason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted text-xs font-mono">
                        {p.transactionRef ?? p.razorpayPayoutId ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center ${accent}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs text-muted">{label}</div>
          <div className={`text-xl font-bold ${accent} mt-0.5`}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function PayoutPanel({
  kycStatus,
  balance,
  canRequest,
  hasInflight,
}: {
  kycStatus: string;
  balance: number;
  canRequest: boolean;
  hasInflight: boolean;
}) {
  if (kycStatus !== "VERIFIED") {
    return (
      <div className="rounded-xl border border-gold/20 bg-gold-muted p-5 flex items-start gap-4">
        <ShieldCheck className="w-5 h-5 text-gold shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-primary">
            KYC verification required
          </div>
          <p className="text-xs text-secondary mt-1 leading-relaxed">
            Indian regulations require us to verify your identity and bank
            account before sending any payout. Takes 2 minutes.
          </p>
          <Link
            href="/dashboard/kyc"
            className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-md text-xs font-semibold text-gold bg-gold/10 hover:bg-gold/20 border border-gold/30 transition-colors"
          >
            Start KYC
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  if (hasInflight) {
    return (
      <div className="rounded-xl border border-info/20 bg-info-muted p-5 flex items-start gap-4">
        <Clock className="w-5 h-5 text-info shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-primary">
            Payout in progress
          </div>
          <p className="text-xs text-secondary mt-1 leading-relaxed">
            You have a payout being processed. New sales will accrue to your
            balance — you can request again once the current one settles.
          </p>
        </div>
      </div>
    );
  }

  if (balance < MIN_PAYOUT_PAISE) {
    const need = MIN_PAYOUT_PAISE - balance;
    return (
      <div className="rounded-xl border border-border bg-surface p-5 flex items-start gap-4">
        <Banknote className="w-5 h-5 text-muted shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-primary">
            Minimum payout is {formatMoney(MIN_PAYOUT_PAISE)}
          </div>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            You need {formatMoney(need)} more before you can request a payout.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-accent/20 bg-accent-muted p-5 flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-semibold text-primary">
          Ready to withdraw
        </div>
        <p className="text-xs text-secondary mt-1 leading-relaxed">
          Funds typically arrive in 1-3 business days via IMPS.
        </p>
      </div>
      <RequestPayoutButton disabled={!canRequest} amount={balance} />
    </div>
  );
}
