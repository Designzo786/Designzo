import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { PurchaseStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES: PurchaseStatus[] = ["COMPLETED", "PENDING", "REFUNDED"];

/**
 * CSV export for admin sales — what accountants need to reconcile
 * Razorpay payouts against marketplace activity.
 *
 * Query params:
 *   status   — filter to COMPLETED / PENDING / REFUNDED (default: COMPLETED)
 *   period   — 7d / 30d / 90d / all (default: 30d)
 *   from,to  — explicit ISO date overrides (yyyy-mm-dd); when present they
 *              win over `period`
 *
 * Response: text/csv with a streaming-friendly body. Every row is one
 * Purchase. Money columns are emitted in rupees (₹) as decimals so a
 * spreadsheet doesn't have to do paise → rupees math.
 *
 * Caveat: we cap at 10,000 rows per export to keep memory bounded. An
 * operator who needs more than that should use multiple date-range
 * exports instead of paginating one giant file.
 */
const MAX_ROWS = 10_000;

const PERIOD_DAYS: Record<string, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // RFC 4180: quote-wrap any field containing comma, quote, CR, or LF.
  // Embedded quotes get doubled.
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status") ?? "COMPLETED";
  const status = VALID_STATUSES.includes(statusParam as PurchaseStatus)
    ? (statusParam as PurchaseStatus)
    : "COMPLETED";

  const period = url.searchParams.get("period") ?? "30d";
  const periodDays =
    PERIOD_DAYS[period] !== undefined ? PERIOD_DAYS[period] : 30;
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  let from: Date | null = null;
  let to: Date | null = null;
  if (fromParam) {
    const d = new Date(fromParam);
    if (!Number.isNaN(d.getTime())) from = d;
  }
  if (toParam) {
    const d = new Date(toParam);
    if (!Number.isNaN(d.getTime())) to = d;
  }
  if (!from && periodDays !== null) {
    from = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  }

  const purchases = await prisma.purchase.findMany({
    where: {
      status,
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: {
      buyer: { select: { name: true, email: true } },
      asset: {
        select: {
          title: true,
          category: true,
          uploader: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
  });

  // Headers chosen to land in a spreadsheet with no extra cleanup:
  // human-readable column titles, ₹-denominated amounts, ISO dates.
  const header = [
    "Purchase ID",
    "Date (UTC)",
    "Status",
    "Asset",
    "Category",
    "Creator",
    "Creator email",
    "Buyer",
    "Buyer email",
    "Gross (INR)",
    "Platform fee (INR)",
    "Creator earning (INR)",
    "License key",
    "Razorpay order",
    "Razorpay payment",
  ].join(",");

  const rows = purchases.map((p) =>
    [
      p.id,
      p.createdAt.toISOString(),
      p.status,
      csvEscape(p.asset.title),
      p.asset.category,
      csvEscape(p.asset.uploader.name ?? ""),
      csvEscape(p.asset.uploader.email),
      csvEscape(p.buyer.name ?? ""),
      csvEscape(p.buyer.email),
      paiseToRupees(p.amount),
      paiseToRupees(p.platformFee),
      paiseToRupees(p.creatorEarning),
      p.licenseKey,
      csvEscape(p.razorpayOrderId ?? ""),
      csvEscape(p.razorpayPaymentId ?? ""),
    ].join(",")
  );

  // Excel-friendly UTF-8 BOM so Devanagari titles + "₹" survive an
  // Excel open without manual encoding hints.
  const body = "﻿" + [header, ...rows].join("\r\n");

  const fnSafePeriod = from
    ? `${from.toISOString().slice(0, 10)}_to_${(to ?? new Date()).toISOString().slice(0, 10)}`
    : "all-time";
  const filename = `dezignxo-sales-${status.toLowerCase()}-${fnSafePeriod}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
