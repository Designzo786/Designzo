import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Role } from "@prisma/client";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Public-facing creator name for an asset. Assets uploaded by an ADMIN are
 * shown as official "Designzo" listings rather than under the admin's
 * personal name.
 */
export function creatorDisplayName(
  name: string | null | undefined,
  role: Role
): string {
  if (role === "ADMIN") return "Designzo";
  return name ?? "Unknown";
}

/**
 * Format an asset's selling price. 0 is shown as the word "Free" because
 * that's how a free asset reads in product context (cards, checkout). For
 * account balances / earnings / payouts where 0 means "no money yet",
 * use formatMoney() instead.
 */
export function formatPrice(paise: number): string {
  if (paise === 0) return "Free";
  return formatMoney(paise);
}

/**
 * Format a currency amount in INR. Always renders the rupee symbol, even
 * for 0 — meant for balances, earnings, payouts and any other "money in
 * an account" display where "Free" would be misleading.
 */
export function formatMoney(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return formatDate(date);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length)}…`;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateLicenseKey(): string {
  const segments = Array.from({ length: 4 }, () =>
    Math.random().toString(36).slice(2, 7).toUpperCase()
  );
  return segments.join("-");
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function commissionCalc(priceInPaise: number, commissionPct: number) {
  const platformFee = Math.round(priceInPaise * (commissionPct / 100));
  const creatorEarning = priceInPaise - platformFee;
  return { platformFee, creatorEarning };
}
