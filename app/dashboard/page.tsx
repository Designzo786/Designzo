import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Library,
  Upload,
  DollarSign,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  ImageOff,
  ShoppingBag,
  TrendingUp,
  Sparkles,
  Clock,
  Banknote,
  ShieldCheck,
  FileCheck,
  Bell,
  Minus,
  CheckCircle2,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/Avatar";
import { formatMoney, formatPrice, formatRelativeTime } from "@/lib/utils";
import type { AssetStatus } from "@prisma/client";

export const metadata = { title: "Dashboard" };

const STATUS_BADGE: Record<AssetStatus, string> = {
  PENDING: "text-gold bg-gold-muted border-gold/20",
  APPROVED: "text-accent-light bg-accent-muted border-accent/20",
  REJECTED: "text-danger bg-danger-muted border-danger/20",
};

// Minimum payout — kept in sync with /api/payouts/request and the
// earnings page. Used here to decide whether to nudge the creator to
// withdraw their balance.
const MIN_PAYOUT_PAISE = 50000;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Compares two counts over equal time windows and returns a signed
 * percentage delta. Caps the absolute value at 999 so a "1 → 100"
 * spike doesn't render as 9900% and break the layout. Returns null
 * when the prior period was zero AND the current period is zero —
 * "no change from nothing" is more honest than infinity.
 */
function delta(current: number, prior: number): {
  pct: number | null;
  direction: "up" | "down" | "flat";
} {
  if (current === 0 && prior === 0) return { pct: null, direction: "flat" };
  if (prior === 0)
    return { pct: 100, direction: "up" }; // any growth from zero is "new"
  const raw = ((current - prior) / prior) * 100;
  const pct = Math.max(-999, Math.min(999, Math.round(raw)));
  const direction = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  return { pct, direction };
}

export default async function DashboardHome() {
  const session = await auth();
  if (!session) return null;
  if (session.user.role === "USER") redirect("/dashboard/library");

  // ── Time windows for trend deltas ──────────────────────────────────
  // Compare the last 30 days against the prior 30. Computed once so we
  // can pass identical bounds into every Promise.all branch.
  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    user,
    purchaseCount,
    uploadCount,
    recentUploads,
    recentPurchases,
    recentSales,
    topAssets,
    salesAgg,
    pendingAssetsCount,
    inflightPayout,
    purchases30d,
    purchases60d,
    sales30d,
    sales60d,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        image: true,
        balance: true,
        role: true,
        kycStatus: true,
      },
    }),
    prisma.purchase.count({
      where: { buyerId: session.user.id, status: "COMPLETED" },
    }),
    prisma.asset.count({ where: { uploaderId: session.user.id } }),
    prisma.asset.findMany({
      where: { uploaderId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        title: true,
        previewKey: true,
        status: true,
        price: true,
        createdAt: true,
      },
    }),
    prisma.purchase.findMany({
      where: { buyerId: session.user.id, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        createdAt: true,
        asset: {
          select: { id: true, title: true, previewKey: true, price: true },
        },
      },
    }),
    // Sales of THIS user's uploads — distinct from `recentPurchases`
    // which is what they bought. Same shape so the panel renders with
    // the same component.
    prisma.purchase.findMany({
      where: {
        status: "COMPLETED",
        asset: { uploaderId: session.user.id },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        createdAt: true,
        amount: true,
        creatorEarning: true,
        buyer: { select: { name: true, email: true, image: true } },
        asset: {
          select: { id: true, title: true, previewKey: true },
        },
      },
    }),
    prisma.asset.findMany({
      where: { uploaderId: session.user.id, status: "APPROVED" },
      orderBy: { downloads: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        previewKey: true,
        downloads: true,
        price: true,
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
    prisma.asset.count({
      where: { uploaderId: session.user.id, status: "PENDING" },
    }),
    prisma.payout.findFirst({
      where: {
        creatorId: session.user.id,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      select: { id: true, amount: true, status: true },
    }),
    // 30-day windows for trend deltas — count purchases and creator-
    // side sales separately so each stat card can show its own arrow.
    prisma.purchase.count({
      where: {
        buyerId: session.user.id,
        status: "COMPLETED",
        createdAt: { gte: thirtyAgo },
      },
    }),
    prisma.purchase.count({
      where: {
        buyerId: session.user.id,
        status: "COMPLETED",
        createdAt: { gte: sixtyAgo, lt: thirtyAgo },
      },
    }),
    prisma.purchase.count({
      where: {
        status: "COMPLETED",
        asset: { uploaderId: session.user.id },
        createdAt: { gte: thirtyAgo },
      },
    }),
    prisma.purchase.count({
      where: {
        status: "COMPLETED",
        asset: { uploaderId: session.user.id },
        createdAt: { gte: sixtyAgo, lt: thirtyAgo },
      },
    }),
  ]);

  if (!user) return null;

  const firstName = user.name?.split(" ")[0];
  const lifetimeEarned = salesAgg._sum.creatorEarning ?? 0;
  const salesCount = salesAgg._count._all;
  const hasAnyUpload = recentUploads.length > 0;
  const hasAnyPurchase = recentPurchases.length > 0;
  const hasAnySales = recentSales.length > 0;

  // ── Action items (only shown when there's something to surface) ────
  // Five conditions, evaluated in priority order. The first one with
  // signal renders at the top of the dashboard with a clear CTA.
  const actionItems = buildActionItems({
    role: user.role,
    kycStatus: user.kycStatus,
    balance: user.balance,
    pendingAssetsCount,
    inflightPayout,
  });

  const purchaseDelta = delta(purchases30d, purchases60d);
  const salesDelta = delta(sales30d, sales60d);

  const stats = [
    {
      label: "Owned assets",
      value: purchaseCount.toLocaleString(),
      icon: Library,
      href: "/dashboard/library",
      accent:
        "from-violet-500/15 to-violet-500/0 text-violet-300 border-violet-400/25",
      delta: purchaseDelta,
    },
    {
      label: "Uploaded",
      value: uploadCount.toLocaleString(),
      icon: Upload,
      href: "/dashboard/uploads",
      accent:
        "from-pink-500/15 to-pink-500/0 text-pink-300 border-pink-400/25",
      delta: null,
    },
    {
      label: "Sales",
      value: salesCount.toLocaleString(),
      icon: ShoppingBag,
      href: "/dashboard/earnings",
      accent:
        "from-emerald-500/15 to-emerald-500/0 text-emerald-300 border-emerald-400/25",
      delta: salesDelta,
    },
    {
      label: "Available balance",
      value: formatMoney(user.balance),
      icon: DollarSign,
      href: "/dashboard/earnings",
      accent: "from-gold/15 to-gold/0 text-gold border-gold/25",
      delta: null,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-accent/10 blur-3xl"
        />
        <div className="relative flex items-center gap-4 sm:gap-5">
          <Avatar src={user.image} name={user.name ?? user.email} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
                {greeting()}
                {firstName ? `, ${firstName}` : ""}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider text-accent-light bg-accent-muted border border-accent/20">
                <Sparkles className="w-3 h-3" />
                {user.role}
              </span>
            </div>
            <p className="text-sm text-muted mt-1">
              {actionItems.length > 0
                ? `You have ${actionItems.length} item${actionItems.length === 1 ? "" : "s"} that need your attention.`
                : user.role === "ADMIN"
                  ? "Here's your studio overview — manage assets, payouts, and creators."
                  : "Here's your creator overview — track uploads, sales, and earnings."}
            </p>
          </div>
        </div>
      </header>

      {/* ─── Needs-your-attention panel ───────────────────────────────
          Only rendered when there's at least one action item. Lives at
          the top of the page so it's the first thing the user sees
          after the greeting. Each row carries its own CTA. */}
      {actionItems.length > 0 && (
        <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold-muted via-gold-muted/40 to-transparent overflow-hidden">
          <header className="flex items-center justify-between px-5 py-3 border-b border-gold/20">
            <div className="inline-flex items-center gap-2">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex w-full h-full rounded-full bg-gold opacity-75 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-gold" />
              </span>
              <Bell className="w-4 h-4 text-gold" />
              <h2 className="text-sm font-semibold text-primary">
                Needs your attention
              </h2>
            </div>
            <span className="text-xs font-semibold text-gold/90 tabular-nums">
              {actionItems.length}
            </span>
          </header>
          <ul className="divide-y divide-gold/10">
            {actionItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-3 p-4 sm:p-5 hover:bg-gold/5 transition-colors"
                  >
                    <span
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${item.tone}`}
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-primary">
                        {item.title}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {item.body}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gold inline-flex items-center gap-1 shrink-0">
                      {item.cta}
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ─── Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="group relative overflow-hidden rounded-xl border border-border bg-surface p-4 sm:p-5 hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-300"
            >
              <div
                aria-hidden
                className={`pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${s.accent} blur-2xl opacity-50 group-hover:opacity-90 transition-opacity`}
              />
              <div className="relative flex items-start justify-between mb-3 sm:mb-4">
                <div
                  className={`w-10 h-10 rounded-lg border bg-gradient-to-br flex items-center justify-center ${s.accent}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-accent-light group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="relative text-xl sm:text-2xl font-bold text-primary tabular-nums">
                {s.value}
              </div>
              <div className="relative flex items-center justify-between gap-2 mt-0.5">
                <span className="text-[11px] sm:text-xs text-muted uppercase tracking-wider">
                  {s.label}
                </span>
                {s.delta && s.delta.pct !== null && <DeltaPill delta={s.delta} />}
              </div>
            </Link>
          );
        })}
      </div>

      {/* ─── Recent uploads + Recent activity (sales OR purchases) ────
          Creators see "Recent sales" on the right — feedback loop from
          their own uploads. Buyers (or creators with no sales yet) see
          "Recent purchases". This makes the panel always useful regardless
          of where the user is in their journey. */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
        <Panel
          title="Recent uploads"
          icon={Upload}
          seeAllHref="/dashboard/uploads"
          empty={
            !hasAnyUpload && (
              <EmptyState
                title="No uploads yet"
                body="Ship your first asset to start earning."
                ctaLabel="Upload an asset"
                ctaHref="/dashboard/uploads/new"
              />
            )
          }
        >
          <ul className="divide-y divide-border">
            {recentUploads.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/explore/${a.id}`}
                  className="group flex items-center gap-3 p-3 sm:p-4 hover:bg-elevated/50 transition-colors"
                >
                  <Thumbnail src={a.previewKey} alt={a.title} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-primary truncate group-hover:text-accent-light transition-colors">
                      {a.title}
                    </div>
                    <div className="text-xs text-muted mt-0.5 inline-flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(a.createdAt)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${STATUS_BADGE[a.status]}`}
                    >
                      {a.status}
                    </span>
                    <div className="text-xs font-medium text-secondary mt-1 tabular-nums">
                      {formatPrice(a.price)}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        {hasAnySales ? (
          <Panel
            title="Recent sales"
            icon={TrendingUp}
            seeAllHref="/dashboard/earnings"
          >
            <ul className="divide-y divide-border">
              {recentSales.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/explore/${s.asset.id}`}
                    className="group flex items-center gap-3 p-3 sm:p-4 hover:bg-elevated/50 transition-colors"
                  >
                    <Avatar
                      src={s.buyer.image}
                      name={s.buyer.name ?? s.buyer.email}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-primary truncate">
                        <span className="text-secondary font-normal">
                          {s.buyer.name ?? "Someone"} bought
                        </span>{" "}
                        <span className="group-hover:text-accent-light transition-colors">
                          {s.asset.title}
                        </span>
                      </div>
                      <div className="text-xs text-muted mt-0.5 inline-flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(s.createdAt)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-info tabular-nums">
                        +{formatMoney(s.creatorEarning)}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted">
                        Earned
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        ) : (
          <Panel
            title="Recent purchases"
            icon={ShoppingBag}
            seeAllHref="/dashboard/library"
            empty={
              !hasAnyPurchase && (
                <EmptyState
                  title="No purchases yet"
                  body="Browse the marketplace and pick up your first asset."
                  ctaLabel="Browse marketplace"
                  ctaHref="/explore"
                />
              )
            }
          >
            <ul className="divide-y divide-border">
              {recentPurchases.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/explore/${p.asset.id}`}
                    className="group flex items-center gap-3 p-3 sm:p-4 hover:bg-elevated/50 transition-colors"
                  >
                    <Thumbnail src={p.asset.previewKey} alt={p.asset.title} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-primary truncate group-hover:text-accent-light transition-colors">
                        {p.asset.title}
                      </div>
                      <div className="text-xs text-muted mt-0.5 inline-flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(p.createdAt)}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-secondary shrink-0 tabular-nums">
                      {formatPrice(p.asset.price)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      {/* ─── Top-performing assets (creator only) ─────────────────── */}
      {topAssets.length > 0 && (
        <Panel
          title="Top performing assets"
          icon={TrendingUp}
          seeAllHref="/dashboard/uploads"
        >
          <ul className="divide-y divide-border">
            {topAssets.map((a, i) => (
              <li key={a.id}>
                <Link
                  href={`/explore/${a.id}`}
                  className="group flex items-center gap-3 p-3 sm:p-4 hover:bg-elevated/50 transition-colors"
                >
                  <span className="w-7 text-center text-sm font-bold text-muted tabular-nums shrink-0">
                    {i + 1}
                  </span>
                  <Thumbnail src={a.previewKey} alt={a.title} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-primary truncate group-hover:text-accent-light transition-colors">
                      {a.title}
                    </div>
                    <div className="text-xs text-muted mt-0.5 tabular-nums">
                      {a.downloads.toLocaleString()} download
                      {a.downloads === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-secondary shrink-0 tabular-nums">
                    {formatPrice(a.price)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* ─── Lifetime earnings highlight (creator only) ─────────────── */}
      {lifetimeEarned > 0 && (
        <Link
          href="/dashboard/earnings"
          className="group block relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-gold-muted via-gold-muted/40 to-transparent p-5 sm:p-6 hover:border-gold/50 transition-all"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-12 -right-12 w-56 h-56 rounded-full bg-gold/15 blur-3xl"
          />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gold/15 border border-gold/30 text-gold flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs uppercase tracking-wider text-gold/80 font-semibold">
                Lifetime earned
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-primary tabular-nums">
                {formatMoney(lifetimeEarned)}
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gold group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

interface ActionItem {
  id: string;
  icon: typeof Bell;
  tone: string;
  title: string;
  body: string;
  cta: string;
  href: string;
}

/**
 * Build the "Needs your attention" list. Priorities, top-to-bottom:
 *  1. In-flight payout — the most actionable signal (status update).
 *  2. Pending asset reviews — creator wants to know about the queue.
 *  3. KYC not verified — blocks payouts entirely.
 *  4. Balance ready for payout — earnings sitting idle.
 *
 * Returns the rendered items in that priority order. Empty array means
 * nothing to surface and the whole panel is hidden.
 */
function buildActionItems(input: {
  role: string;
  kycStatus: string;
  balance: number;
  pendingAssetsCount: number;
  inflightPayout: { status: string; amount: number } | null;
}): ActionItem[] {
  const items: ActionItem[] = [];

  if (input.inflightPayout) {
    items.push({
      id: "inflight-payout",
      icon: Banknote,
      tone: "bg-info-muted text-info border-info/30",
      title: `Payout ${input.inflightPayout.status.toLowerCase()}`,
      body: `${formatMoney(input.inflightPayout.amount)} is on the way — usually 1-3 business days.`,
      cta: "View status",
      href: "/dashboard/earnings",
    });
  }

  if (input.pendingAssetsCount > 0) {
    items.push({
      id: "pending-assets",
      icon: FileCheck,
      tone: "bg-gold-muted text-gold border-gold/30",
      title: `${input.pendingAssetsCount} asset${
        input.pendingAssetsCount === 1 ? "" : "s"
      } awaiting review`,
      body: "An admin typically approves new uploads within 1 business day.",
      cta: "See queue",
      href: "/dashboard/uploads",
    });
  }

  if (input.kycStatus !== "VERIFIED" && input.role !== "USER") {
    items.push({
      id: "kyc",
      icon: ShieldCheck,
      tone: "bg-danger-muted text-danger border-danger/30",
      title: "KYC verification required",
      body: "Verify your identity to unlock bank payouts. Takes 2 minutes.",
      cta: "Start KYC",
      href: "/dashboard/kyc",
    });
  }

  if (
    !input.inflightPayout &&
    input.kycStatus === "VERIFIED" &&
    input.balance >= MIN_PAYOUT_PAISE
  ) {
    items.push({
      id: "payout-ready",
      icon: Banknote,
      tone: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30",
      title: `${formatMoney(input.balance)} ready to withdraw`,
      body: "Request a payout — funds typically arrive in 1-3 business days.",
      cta: "Request payout",
      href: "/dashboard/earnings",
    });
  }

  return items;
}

function DeltaPill({
  delta,
}: {
  delta: { pct: number | null; direction: "up" | "down" | "flat" };
}) {
  if (delta.pct === null) return null;
  const Icon =
    delta.direction === "up"
      ? ArrowUpRight
      : delta.direction === "down"
        ? ArrowDownRight
        : Minus;
  const tone =
    delta.direction === "up"
      ? "text-info"
      : delta.direction === "down"
        ? "text-danger"
        : "text-muted";
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums ${tone}`}
      title="vs prior 30 days"
    >
      <Icon className="w-3 h-3" />
      {Math.abs(delta.pct)}%
    </span>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
  seeAllHref,
  empty,
}: {
  title: string;
  icon: typeof Library;
  children: React.ReactNode;
  seeAllHref?: string;
  empty?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface overflow-hidden">
      <header className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border">
        <div className="inline-flex items-center gap-2">
          <Icon className="w-4 h-4 text-accent-light" />
          <h2 className="text-sm font-semibold text-primary">{title}</h2>
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-accent-light transition-colors"
          >
            See all
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </header>
      {empty ? <div className="p-5">{empty}</div> : children}
    </section>
  );
}

function Thumbnail({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="w-12 h-12 rounded-lg bg-elevated border border-border flex items-center justify-center text-subtle shrink-0">
        <ImageOff className="w-4 h-4" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="w-12 h-12 rounded-lg object-cover bg-canvas border border-border shrink-0"
    />
  );
}

function EmptyState({
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="text-center py-4">
      <div className="inline-flex w-10 h-10 rounded-full bg-accent-muted border border-accent/20 text-accent-light items-center justify-center mb-3">
        <CheckCircle2 className="w-5 h-5" />
      </div>
      <p className="text-sm font-medium text-primary">{title}</p>
      <p className="text-xs text-muted mt-1">{body}</p>
      <Link
        href={ctaHref}
        className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-xs font-medium text-accent-light border border-accent/30 hover:bg-accent-muted transition-colors"
      >
        {ctaLabel}
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

