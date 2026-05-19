"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileCheck,
  Users,
  UserCheck,
  Wallet,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/assets", label: "Assets", icon: FileCheck },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/creators", label: "Creators", icon: UserCheck },
  { href: "/admin/kyc", label: "KYC", icon: ShieldCheck },
  { href: "/admin/payments", label: "Payouts", icon: Wallet },
  { href: "/admin/logs", label: "Audit Log", icon: ScrollText },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
      {ITEMS.map((item) => {
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
                ? "bg-gold-muted text-gold border border-gold/20"
                : "text-secondary hover:text-primary hover:bg-elevated"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
