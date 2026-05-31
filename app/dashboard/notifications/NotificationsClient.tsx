"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Trash2, MoreHorizontal, RefreshCw } from "lucide-react";
import { useDialog } from "@/components/ui/ConfirmDialog";
import { getNotificationStyle } from "@/lib/notification-styles";
import { formatRelativeTime, cn } from "@/lib/utils";

type Filter = "all" | "unread";

interface Item {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationsClient() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<Item[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [, startTransition] = useTransition();
  const { confirm, dialog } = useDialog();

  const load = useCallback(
    async (opts: { cursor?: string; reset?: boolean } = {}) => {
      const params = new URLSearchParams({ filter, limit: "20" });
      if (opts.cursor) params.set("cursor", opts.cursor);

      const res = await fetch(`/api/notifications?${params}`);
      if (!res.ok) {
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      const data = await res.json();
      setUnreadCount(data.unreadCount ?? 0);
      setNextCursor(data.nextCursor ?? null);
      if (opts.reset || !opts.cursor) {
        setItems(data.notifications ?? []);
      } else {
        setItems((prev) => [...prev, ...(data.notifications ?? [])]);
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [filter]
  );

  // Reload whenever the filter changes (or on first mount).
  useEffect(() => {
    setLoading(true);
    load({ reset: true });
  }, [load]);

  async function markRead(id: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, read: true } : i))
    );
    setUnreadCount((u) => Math.max(0, u - 1));
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  async function markAllRead() {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications/read", { method: "POST" }).catch(() => {});
  }

  async function deleteOne(id: string) {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (item && !item.read) setUnreadCount((u) => Math.max(0, u - 1));
    const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    if (!res.ok) {
      // Rollback on failure
      load({ reset: true });
    }
  }

  async function clearRead() {
    const ok = await confirm({
      variant: "danger",
      title: "Clear all read notifications?",
      body: "Every notification you've already opened will be removed. Unread items stay.",
      confirmLabel: "Clear read",
    });
    if (!ok) return;
    const res = await fetch("/api/notifications?scope=read", {
      method: "DELETE",
    });
    if (!res.ok) return;
    load({ reset: true });
  }

  async function clearAll() {
    const ok = await confirm({
      variant: "danger",
      title: "Clear ALL notifications?",
      body: "This wipes your entire inbox — read and unread. You can't undo this.",
      confirmLabel: "Clear everything",
    });
    if (!ok) return;
    const res = await fetch("/api/notifications?scope=all", {
      method: "DELETE",
    });
    if (!res.ok) return;
    load({ reset: true });
  }

  function onItemClick(item: Item) {
    if (!item.read) markRead(item.id);
    if (item.link) startTransition(() => router.push(item.link!));
  }

  function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    load({ cursor: nextCursor });
  }

  return (
    <>
      {/* Toolbar — filter tabs + bulk actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-elevated border border-border p-0.5">
          <FilterTab
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="All"
          />
          <FilterTab
            active={filter === "unread"}
            onClick={() => setFilter("unread")}
            label={unreadCount > 0 ? `Unread · ${unreadCount}` : "Unread"}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => load({ reset: true })}
            disabled={loading}
            title="Refresh"
            aria-label="Refresh notifications"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted hover:text-primary hover:bg-elevated transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-accent-light bg-accent-muted hover:bg-accent/20 border border-accent/20 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          <BulkMenu onClearRead={clearRead} onClearAll={clearAll} />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <ul className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
          {items.map((n) => (
            <NotificationRow
              key={n.id}
              item={n}
              onClick={() => onItemClick(n)}
              onMarkRead={() => markRead(n.id)}
              onDelete={() => deleteOne(n.id)}
            />
          ))}
        </ul>
      )}

      {/* Load more */}
      {nextCursor && !loading && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-secondary hover:text-primary border border-border hover:border-border-hover transition-colors disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load older"}
          </button>
        </div>
      )}

      {dialog}
    </>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function FilterTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
        active
          ? "bg-surface text-primary shadow-sm"
          : "text-muted hover:text-primary"
      )}
    >
      {label}
    </button>
  );
}

function BulkMenu({
  onClearRead,
  onClearAll,
}: {
  onClearRead: () => void;
  onClearAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  // Close on click-outside via a one-shot listener whenever opened.
  useEffect(() => {
    if (!open) return;
    const onDoc = () => setOpen(false);
    const t = setTimeout(() => document.addEventListener("click", onDoc), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", onDoc);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="More actions"
        className="inline-flex items-center px-2 py-1.5 rounded-md text-muted hover:text-primary hover:bg-elevated transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-48 popover rounded-lg shadow-lg z-20 animate-fade-in overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onClearRead();
            }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-secondary hover:bg-elevated hover:text-primary transition-colors"
          >
            Clear read notifications
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onClearAll();
            }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-danger hover:bg-danger-muted transition-colors"
          >
            Clear everything
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  item,
  onClick,
  onMarkRead,
  onDelete,
}: {
  item: Item;
  onClick: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const s = getNotificationStyle(item.type);
  const Icon = s.icon;
  return (
    <li
      className={cn(
        "group relative transition-colors",
        !item.read && "bg-accent-muted/30"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full flex gap-3 px-4 py-3.5 text-left hover:bg-elevated/60 transition-colors"
      >
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            "bg-elevated border border-border",
            s.className
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-primary truncate">
              {item.title}
            </span>
            {!item.read && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-0.5" />
            )}
          </div>
          <p className="text-xs text-secondary leading-snug mt-0.5">
            {item.body}
          </p>
          <div className="text-[11px] text-muted mt-1.5">
            {formatRelativeTime(new Date(item.createdAt))}
          </div>
        </div>
      </button>

      {/* Per-row actions — hidden until hover so the row stays clean */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!item.read && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead();
            }}
            aria-label="Mark as read"
            title="Mark as read"
            className="p-1.5 rounded-md text-muted hover:text-accent-light hover:bg-accent-muted transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete notification"
          title="Delete"
          className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-muted transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </li>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  return (
    <div className="rounded-xl border border-border border-dashed bg-surface/50 p-12 text-center">
      <Bell className="w-8 h-8 text-muted mx-auto mb-3" />
      <h3 className="text-sm font-semibold text-primary">
        {filter === "unread" ? "Nothing unread" : "No notifications yet"}
      </h3>
      <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
        {filter === "unread"
          ? "You're all caught up. New notifications will appear here as activity happens."
          : "Asset approvals, sales, payouts, and other activity will show up here."}
      </p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex gap-3 px-4 py-4">
          <div className="w-9 h-9 rounded-lg bg-elevated animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-elevated animate-pulse" />
            <div className="h-2.5 w-2/3 rounded bg-elevated/60 animate-pulse" />
            <div className="h-2 w-16 rounded bg-elevated/40 animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  );
}
