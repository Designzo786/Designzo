import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminSession, writeAdminLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import type { AssetStatus } from "@prisma/client";

export const runtime = "nodejs";

const VALID_STATUSES: AssetStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "NEEDS_IMPROVEMENT",
];

// Reasonable upper bound so a bored admin can't pass 10k IDs in one
// request and DOS the notification fan-out. 100 covers any realistic
// moderation backlog clear-out.
const MAX_BULK = 100;

/**
 * Bulk admin moderation. Single round-trip APPROVE / REJECT /
 * NEEDS_IMPROVEMENT against many assets at once — replaces the
 * one-at-a-time button-click loop that an admin clearing a backlog
 * otherwise has to do.
 *
 * Body:
 *   { ids: string[], status: AssetStatus, note?: string }
 *
 * Behaviour mirrors the per-asset PATCH route:
 *   - `rejectionNote` field is populated for REJECTED / NEEDS_IMPROVEMENT
 *     (shared message across all selected rows), nulled otherwise.
 *   - One AdminLog entry per asset (so the audit trail stays granular).
 *   - One notification per asset to the uploader.
 *   - `revalidateTag("assets")` once at the end (not per asset).
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { ids, status, note } = (body ?? {}) as {
    ids?: string[];
    status?: AssetStatus;
    note?: string;
  };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one asset id." },
      { status: 400 }
    );
  }
  if (ids.length > MAX_BULK) {
    return NextResponse.json(
      { error: `At most ${MAX_BULK} assets per bulk action.` },
      { status: 400 }
    );
  }
  if (!ids.every((id) => typeof id === "string" && id.length > 0)) {
    return NextResponse.json(
      { error: "Every id must be a non-empty string." },
      { status: 400 }
    );
  }
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "Invalid target status." },
      { status: 400 }
    );
  }
  if (note !== undefined && typeof note !== "string") {
    return NextResponse.json({ error: "Invalid note." }, { status: 400 });
  }

  // Pull the assets we're about to change in one query — we need each
  // uploaderId + title for the per-asset notification + log.
  const targets = await prisma.asset.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, uploaderId: true },
  });
  if (targets.length === 0) {
    return NextResponse.json(
      { error: "No matching assets found." },
      { status: 404 }
    );
  }

  // updateMany is a single SQL statement — way faster than N round-trips
  // even when N == 100. The rejectionNote field is reused for the
  // NEEDS_IMPROVEMENT message (same "admin tells creator what to change"
  // surface, softer copy).
  const updatesWithNote =
    status === "REJECTED" || status === "NEEDS_IMPROVEMENT";
  await prisma.asset.updateMany({
    where: { id: { in: targets.map((t) => t.id) } },
    data: {
      status,
      rejectionNote: updatesWithNote ? (note ?? null) : null,
    },
  });

  // Granular audit + notifications. Each one fires in its own try so a
  // single notification failure can't block the rest of the batch.
  for (const t of targets) {
    await writeAdminLog({
      adminId: session.user.id,
      action: `${status}_ASSET`,
      targetId: t.id,
      targetType: "ASSET",
      note,
    }).catch(() => {});

    if (status === "APPROVED") {
      await createNotification({
        userId: t.uploaderId,
        type: "ASSET_APPROVED",
        title: "Asset approved",
        body: `"${t.title}" is now live on the marketplace.`,
        link: `/explore/${t.id}`,
      }).catch(() => {});
    } else if (status === "REJECTED") {
      await createNotification({
        userId: t.uploaderId,
        type: "ASSET_REJECTED",
        title: "Asset needs changes",
        body: note
          ? `"${t.title}" was not approved: ${note}`
          : `"${t.title}" was not approved. Review and resubmit.`,
        link: "/dashboard/uploads",
      }).catch(() => {});
    } else if (status === "NEEDS_IMPROVEMENT") {
      await createNotification({
        userId: t.uploaderId,
        type: "ASSET_NEEDS_IMPROVEMENT",
        title: "Asset needs improvement",
        body: note
          ? `"${t.title}" needs some changes: ${note}`
          : `"${t.title}" needs some changes before it can go live.`,
        link: `/dashboard/uploads/${t.id}/edit`,
      }).catch(() => {});
    }
  }

  // Single cache bust at the end — the per-asset PATCH route does the
  // same, but here we only need to do it once.
  revalidateTag("assets", { expire: 0 });

  return NextResponse.json({
    ok: true,
    affected: targets.length,
    status,
  });
}
