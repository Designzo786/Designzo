import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Library,
  Upload,
  DollarSign,
  ArrowRight,
  ArrowUpRight,
  ImageOff,
  ShoppingBag,
  TrendingUp,
  Sparkles,
  Clock,
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

/**
 * Returns a time-of-day greeting in the server's locale. Runs once per
 * request (RSC), no client-side hydration mismatch.
 */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardHome() {
  const session = await auth();
  if (!session) return null;
  // Buy-only USER accounts have no creator overview — their home is the library.
  if (session.user.role === "USER") redirect("/dashboard/library");

  // All dashboard data in one parallel batch — keeps the page snappy.
  const [user, purchaseCount, uploadCount, recentUploads, recentPurchases, topAssets, salesAgg] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          email: true,
          image: true,
          balance: true,
          role: true,
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
      // Lifetime creator earnings — only counts COMPLETED purchases of
      // assets this user uploaded.
      prisma.purchase.aggregate({
        where: {
          status: "COMPLETED",
          asset: { uploaderId: session.user.id },
        },
        _sum: { creatorEarning: true },
        _count: { _all: true },
      }),
    ]);

  if (!user) return null;

  const firstName = user.name?.split(" ")[0];
  const lifetimeEarned = salesAgg._sum.creatorEarning ?? 0;
  const salesCount = salesAgg._count._all;
  const hasAnyUpload = recentUploads.length > 0;
  const hasAnyPurchase = recentPurchases.length > 0;

  const stats = [
    {
      label: "Owned assets",
      value: purchaseCount.toLocaleString(),
      icon: Library,
      href: "/dashboard/library",
      accent:
        "from-violet-500/15 to-violet-500/0 text-violet-300 border-violet-400/25",
    },
    {
      label: "Uploaded",
      value: uploadCount.toLocaleString(),
      icon: Upload,
      href: "/dashboard/uploads",
      accent:
        "from-pink-500/15 to-pink-500/0 text-pink-300 border-pink-400/25",
    },
    {
      label: "Sales",
      value: salesCount.toLocaleString(),
      icon: ShoppingBag,
      href: "/dashboard/earnings",
      accent:
        "from-emerald-500/15 to-emerald-500/0 text-emerald-300 border-emerald-400/25",
    },
    {
      label: "Available balance",
      value: formatMoney(user.balance),
      icon: DollarSign,
      href: "/dashboard/earnings",
      accent: "from-gold/15 to-gold/0 text-gold border-gold/25",
    },
  ];

  return (
    <div className="space-y-8">
      {/* ─── Hero ────────────────────────────────────────────────────────
          Time-of-day greeting + larger avatar + role badge + tagline
          tailored to the account role. Anchors the page emotionally. */}
      <header className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-7">
        {/* Soft violet glow tucked in the corner — premium ambient touch */}
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
              {user.role === "ADMIN"
                ? "Here's your studio overview — manage assets, payouts, and creators."
                : "Here's your creator overview — track uploads, sales, and earnings."}
            </p>
          </div>
        </div>
      </header>

      {/* ─── Stats ───────────────────────────────────────────────────────
          Four cards. Each is a Link so the whole tile is clickable. The
          icon plate inherits a per-card colour gradient so the row reads
          as a balanced palette rather than four identical violet boxes. */}
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
              <div className="relative text-[11px] sm:text-xs text-muted mt-0.5 uppercase tracking-wider">
                {s.label}
              </div>
            </Link>
          );
        })}
      </div>

      {/* ─── Two-column work area ────────────────────────────────────────
          Recent uploads on the left, recent purchases on the right.
          Each card has a clear header + a stacked list of avatars + a
          "see all" footer link. Stacks to one column on phone. */}
      <div className="grid lg:grid-cols-2 gap-5">
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
      </div>

      {/* ─── Top-performing assets (creator only) ────────────────────── */}
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

      {/* ─── Lifetime earnings highlight (creator only) ──────────────── */}
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

/**
 * Reusable card wrapper for the dashboard's grouped lists. Each panel
 * has the same header + body + footer rhythm so the page reads as a
 * coherent dashboard rather than a stack of one-off cards.
 */
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
