import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NotificationType, Prisma } from "@prisma/client";

export const runtime = "nodejs";

const VALID_TYPES = new Set<NotificationType>([
  "ASSET_APPROVED",
  "ASSET_REJECTED",
  "SALE",
  "PURCHASE",
  "PAYOUT_PROCESSING",
  "PAYOUT_PAID",
  "PAYOUT_FAILED",
  "KYC_VERIFIED",
  "KYC_REJECTED",
  "CREATOR_APPROVED",
  "CREATOR_REJECTED",
  "REVIEW",
]);

/**
 * Lists the signed-in user's notifications.
 *
 * Query params (all optional):
 *   filter=unread|all          default: all
 *   type=ASSET_APPROVED|...    repeatable; filters to those types
 *   cursor=<id>                cursor-based pagination (id of last seen item)
 *   limit=<1-50>               default 20, hard-capped 50
 *
 * Response shape:
 *   { notifications, unreadCount, nextCursor }
 *
 * `nextCursor` is the id of the LAST item in this page — pass it back as
 * `cursor` to fetch the next page. null means no more.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter");
  const types = url.searchParams
    .getAll("type")
    .filter((t): t is NotificationType =>
      VALID_TYPES.has(t as NotificationType)
    );
  const cursor = url.searchParams.get("cursor");
  const limitRaw = Number(url.searchParams.get("limit") ?? "20");
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1), 50);

  const where: Prisma.NotificationWhereInput = { userId: session.user.id };
  if (filter === "unread") where.read = false;
  if (types.length > 0) where.type = { in: types };

  // Take limit+1 to detect whether a next page exists.
  const rows = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
      read: true,
      createdAt: true,
    },
  });

  const hasMore = rows.length > limit;
  const notifications = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? notifications[notifications.length - 1].id : null;

  // Unread count is across the user's whole inbox, ignoring filter/cursor —
  // the bell badge always shows total unread, not unread-on-this-page.
  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });

  return NextResponse.json({ notifications, unreadCount, nextCursor });
}

/**
 * Clears notifications in bulk for the signed-in user.
 *
 *   ?scope=read     delete every notification the user has already read
 *   ?scope=all      delete every notification (read + unread)
 *
 * Default is `read` — the safer choice. Always scoped to the caller's userId
 * so one user can never wipe another's inbox.
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "read";

  const where: Prisma.NotificationWhereInput = { userId: session.user.id };
  if (scope === "read") where.read = true;
  else if (scope !== "all") {
    return NextResponse.json(
      { error: "scope must be 'read' or 'all'." },
      { status: 400 }
    );
  }

  const result = await prisma.notification.deleteMany({ where });
  return NextResponse.json({ ok: true, deleted: result.count });
}
