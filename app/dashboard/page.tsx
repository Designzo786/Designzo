import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Library, Upload, DollarSign, ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardHome() {
  const session = await auth();
  if (!session) return null;
  // Buy-only USER accounts have no creator overview — their home is the library.
  if (session.user.role === "USER") redirect("/dashboard/library");

  const [user, purchaseCount, uploadCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, image: true, balance: true, role: true },
    }),
    prisma.purchase.count({
      where: { buyerId: session.user.id, status: "COMPLETED" },
    }),
    prisma.asset.count({ where: { uploaderId: session.user.id } }),
  ]);

  if (!user) return null;

  const stats = [
    {
      label: "Owned assets",
      value: purchaseCount,
      icon: Library,
      href: "/dashboard/library",
    },
    {
      label: "Uploaded assets",
      value: uploadCount,
      icon: Upload,
      href: "/dashboard/uploads",
    },
    {
      label: "Available balance",
      value: formatPrice(user.balance),
      icon: DollarSign,
      href: "/dashboard/earnings",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <Avatar src={user.image} name={user.name ?? user.email} size={56} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted">Here&apos;s what&apos;s happening with your account.</p>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="group rounded-xl border border-border bg-surface p-5 hover:border-accent/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center text-accent-light">
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent-light group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-2xl font-bold text-primary">{s.value}</div>
              <div className="text-xs text-muted mt-1">{s.label}</div>
            </Link>
          );
        })}
      </div>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-base font-semibold text-primary mb-2">Get started</h2>
        <p className="text-sm text-muted mb-4">
          Browse the marketplace, upload your first asset, or complete your profile.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-secondary border border-border hover:border-accent/40 hover:text-accent-light transition-colors"
          >
            Browse marketplace <ArrowRight className="w-3 h-3" />
          </Link>
          <Link
            href="/dashboard/uploads"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-secondary border border-border hover:border-accent/40 hover:text-accent-light transition-colors"
          >
            Upload an asset <ArrowRight className="w-3 h-3" />
          </Link>
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-secondary border border-border hover:border-accent/40 hover:text-accent-light transition-colors"
          >
            Edit profile <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </section>
    </div>
  );
}
