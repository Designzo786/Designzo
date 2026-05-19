"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  ShoppingBag,
  ShieldCheck,
  ShieldAlert,
  Check,
} from "lucide-react";
import { useDropdown } from "@/hooks/useDropdown";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

// Per-type icon + accent colour for the list rows.
const TYPE_STYLE: Record<
  string,
  { icon: typeof Bell; className: string }
> = {
  ASSET_APPROVED: { icon: CheckCircle2, className: "text-accent-light" },
  ASSET_REJECTED: { icon: XCircle, className: "text-danger" },
  SALE: { icon: DollarSign, className: "text-gold" },
  PURCHASE: { icon: ShoppingBag, className: "text-accent-light" },
  PAYOUT_PROCESSING: { icon: Clock, className: "text-info" },
  PAYOUT_PAID: { icon: CheckCircle2, className: "text-accent-light" },
  PAYOUT_FAILED: { icon: XCircle, className: "text-danger" },
  KYC_VERIFIED: { icon: ShieldCheck, className: "text-accent-light" },
  KYC_REJECTED: { icon: ShieldAlert, className: "text-danger" },
};

const POLL_MS = 60_000;

export function NotificationBell() {
  const router = useRouter();
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      // network hiccup — keep the last known state
    } finally {
      setLoaded(true);
    }
  }, []);

  // Initial load + lightweight poll so the badge stays roughly fresh.
  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  // Refresh when the dropdown is opened.
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await fetch("/api/notifications/read", { method: "POST" }).catch(() => {});
  }

  async function onItemClick(n: NotificationItem) {
    if (!n.read) {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
      setUnread((u) => Math.max(0, u - 1));
      fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {});
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-primary hover:bg-elevated transition-colors"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-80 popover rounded-xl shadow-lg animate-fade-in overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-primary">
              Notifications
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent-light hover:text-accent transition-colors"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!loaded ? (
              <div className="px-4 py-8 text-center text-xs text-muted">
                Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="w-7 h-7 text-muted mx-auto mb-2" />
                <p className="text-xs text-muted">
                  No notifications yet.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => {
                  const style = TYPE_STYLE[n.type] ?? {
                    icon: Bell,
                    className: "text-muted",
                  };
                  const Icon = style.icon;
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => onItemClick(n)}
                        className={cn(
                          "w-full flex gap-3 px-4 py-3 text-left transition-colors hover:bg-elevated",
                          !n.read && "bg-accent-muted/40"
                        )}
                      >
                        <Icon
                          className={cn("w-4 h-4 shrink-0 mt-0.5", style.className)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-primary">
                            {n.title}
                          </div>
                          <div className="text-xs text-secondary leading-snug mt-0.5">
                            {n.body}
                          </div>
                          <div className="text-[11px] text-muted mt-1">
                            {formatRelativeTime(new Date(n.createdAt))}
                          </div>
                        </div>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
