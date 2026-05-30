"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Library,
  Upload,
  DollarSign,
  Settings,
  ShieldCheck,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  // Collaborator-only tabs. Plain USER accounts (buy-only) never see these —
  // they get just "My Library" and "Profile".
  creatorOnly?: boolean;
};

const ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true, creatorOnly: true },
  { href: "/dashboard/library", label: "My Library", icon: Library },
  // Wishlist is available to every signed-in user. Buyers (USER role) need
  // it the most — it's where they bookmark assets to come back to before
  // they're ready to buy.
  { href: "/dashboard/wishlist", label: "Wishlist", icon: Heart },
  { href: "/dashboard/uploads", label: "My Assets", icon: Upload, creatorOnly: true },
  { href: "/dashboard/earnings", label: "Earnings", icon: DollarSign, creatorOnly: true },
  { href: "/dashboard/profile", label: "Profile", icon: Settings },
  { href: "/dashboard/kyc", label: "KYC & Legal", icon: ShieldCheck, creatorOnly: true },
];

export function DashboardNav({ role }: { role: Role }) {
  const pathname = usePathname();

  // USER = buy-only account: hide every collaborator tab.
  const items =
    role === "USER" ? ITEMS.filter((i) => !i.creatorOnly) : ITEMS;

  return (
    <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-accent-muted text-accent-light border border-accent/20"
                : "text-secondary hover:text-primary hover:bg-elevated"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}

      {role === "ADMIN" && (
        <>
          <div className="hidden lg:block h-px bg-border my-2" />
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap text-gold hover:bg-gold-muted transition-colors"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            Admin Panel
          </Link>
        </>
      )}
    </nav>
  );
}
