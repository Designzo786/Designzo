"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Library,
  Upload,
  DollarSign,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useDropdown } from "@/hooks/useDropdown";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { Session } from "next-auth";

type MenuItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  // Collaborator-only entries. Plain USER accounts (buy-only) never see these
  // — they just get "My Library" and "Profile", matching the dashboard nav.
  creatorOnly?: boolean;
};

const ITEMS: MenuItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, creatorOnly: true },
  { href: "/dashboard/library", label: "My Library", icon: Library },
  { href: "/dashboard/uploads", label: "My Assets", icon: Upload, creatorOnly: true },
  { href: "/dashboard/earnings", label: "Earnings", icon: DollarSign, creatorOnly: true },
  { href: "/dashboard/profile", label: "Profile", icon: Settings },
  { href: "/dashboard/kyc", label: "KYC & Legal", icon: ShieldCheck, creatorOnly: true },
];

export function UserMenu({ session }: { session: Session }) {
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();
  const isAdmin = session.user.role === "ADMIN";
  const items =
    session.user.role === "USER"
      ? ITEMS.filter((i) => !i.creatorOnly)
      : ITEMS;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-elevated transition-colors"
      >
        <Avatar
          src={session.user.image}
          name={session.user.name ?? session.user.email}
          size={28}
        />
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 popover rounded-xl p-2 shadow-lg animate-fade-in"
        >
          <div className="px-3 py-2 border-b border-border mb-1">
            <div className="text-sm font-medium text-primary truncate">
              {session.user.name ?? "User"}
            </div>
            <div className="text-xs text-muted truncate">
              {session.user.email}
            </div>
          </div>

          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                role="menuitem"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-secondary hover:text-primary hover:bg-elevated transition-colors"
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="my-1 h-px bg-border" />
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                role="menuitem"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gold hover:bg-gold-muted transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                Admin Panel
              </Link>
            </>
          )}

          <div className="my-1 h-px bg-border" />
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            role="menuitem"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-secondary hover:text-danger hover:bg-danger-muted transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
