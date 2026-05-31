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
  Bell,
  Sparkles,
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
  // Inverse — only USER role sees it. Used for the "upgrade to Collaborator"
  // flow that doesn't make sense once you already are one.
  userOnly?: boolean;
};

const ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true, creatorOnly: true },
  { href: "/dashboard/library", label: "My Library", icon: Library },
  // Wishlist is available to every signed-in user. Buyers (USER role) need
  // it the most — it's where they bookmark assets to come back to before
  // they're ready to buy.
  { href: "/dashboard/wishlist", label: "Wishlist", icon: Heart },
  // Inbox of every system event for this user — mirrors what the navbar
  // bell shows, plus full history, filtering, and bulk cleanup.
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/uploads", label: "My Assets", icon: Upload, creatorOnly: true },
  { href: "/dashboard/earnings", label: "Earnings", icon: DollarSign, creatorOnly: true },
  { href: "/dashboard/profile", label: "Profile", icon: Settings },
  { href: "/dashboard/kyc", label: "KYC & Legal", icon: ShieldCheck, creatorOnly: true },
  // Upgrade path — USER accounts only. After the application is approved,
  // role flips to CREATOR and this tab disappears (replaced by the creator
  // tabs above).
  { href: "/dashboard/become-creator", label: "Become a Creator", icon: Sparkles, userOnly: true },
];

export function DashboardNav({ role }: { role: Role }) {
  const pathname = usePathname();

  // USER = buy-only: hide creatorOnly tabs, keep userOnly tabs.
  // CREATOR/ADMIN: hide userOnly tabs (they're already past that step).
  const items =
    role === "USER"
      ? ITEMS.filter((i) => !i.creatorOnly)
      : ITEMS.filter((i) => !i.userOnly);

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
