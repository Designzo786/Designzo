import Link from "next/link";
import {
  FileCheck,
  Users,
  Wallet,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

export default async function AdminOverview() {
  const [pendingAssets, totalUsers, pendingKyc, pendingPayouts, totalRevenueRow] =
    await Promise.all([
      prisma.asset.count({ where: { status: "PENDING" } }),
      prisma.user.count(),
      prisma.user.count({ where: { kycStatus: "PENDING" } }),
      prisma.payout.count({ where: { status: "PENDING" } }),
      prisma.purchase.aggregate({
        where: { status: "COMPLETED" },
        _sum: { platformFee: true },
      }),
    ]);

  const totalRevenue = totalRevenueRow._sum.platformFee ?? 0;

  const cards = [
    {
      label: "Pending assets",
      value: pendingAssets,
      icon: FileCheck,
      href: "/admin/assets",
      tone: pendingAssets > 0 ? "alert" : "ok",
    },
    {
      label: "Pending KYC",
      value: pendingKyc,
      icon: ShieldCheck,
      href: "/admin/kyc",
      tone: pendingKyc > 0 ? "alert" : "ok",
    },
    {
      label: "Total users",
      value: totalUsers,
      icon: Users,
      href: "/admin/users",
      tone: "ok",
    },
    {
      label: "Pending payouts",
      value: pendingPayouts,
      icon: Wallet,
      href: "/admin/payments",
      tone: pendingPayouts > 0 ? "alert" : "ok",
    },
    {
      label: "Platform revenue",
      value: formatPrice(totalRevenue),
      icon: AlertCircle,
      href: "/admin/logs",
      tone: "ok",
    },
  ] as const;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Admin Overview
        </h1>
        <p className="text-sm text-muted mt-1">
          Marketplace health at a glance.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          const accent =
            c.tone === "alert"
              ? "text-gold bg-gold-muted border-gold/20"
              : "text-accent-light bg-accent-muted border-accent/20";
          return (
            <Link
              key={c.label}
              href={c.href}
              className="group rounded-xl border border-border bg-surface p-5 hover:border-accent/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border ${accent}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent-light group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-2xl font-bold text-primary">{c.value}</div>
              <div className="text-xs text-muted mt-1">{c.label}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
