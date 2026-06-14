import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminSession, writeAdminLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import type { AssetStatus } from "@prisma/client";

export const runtime = "nodejs";

const VALID: AssetStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  // NEEDS_IMPROVEMENT is a softer alternative to REJECTED — the asset
  // stays hidden from the public marketplace but the creator gets an
  // explicit note about what to revise and can re-submit by saving
  // an edit (the edit flow flips status back to PENDING).
  "NEEDS_IMPROVEMENT",
];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { status, note } = (body ?? {}) as {
    status?: AssetStatus;
    note?: string;
  };

  if (!status || !VALID.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  if (note !== undefined && typeof note !== "string") {
    return NextResponse.json({ error: "Invalid note." }, { status: 400 });
  }

  // `rejectionNote` is reused for the NEEDS_IMPROVEMENT message — it's
  // the same "admin tells creator what to change" surface, just with
  // softer copy. Schema-wise we don't need a separate column.
  const asset = await prisma.asset.update({
    where: { id },
    data: {
      status,
      rejectionNote:
        status === "REJECTED" || status === "NEEDS_IMPROVEMENT"
          ? (note ?? null)
          : null,
    },
    select: { id: true, status: true, title: true, uploaderId: true },
  });

  await writeAdminLog({
    adminId: session.user.id,
    action: `${status}_ASSET`,
    targetId: asset.id,
    targetType: "ASSET",
    note,
  });

  // Tell the creator their asset's review outcome.
  if (status === "APPROVED") {
    await createNotification({
      userId: asset.uploaderId,
      type: "ASSET_APPROVED",
      title: "Asset approved",
      body: `"${asset.title}" is now live on the marketplace.`,
      link: `/explore/${asset.id}`,
    });
  } else if (status === "REJECTED") {
    await createNotification({
      userId: asset.uploaderId,
      type: "ASSET_REJECTED",
      title: "Asset needs changes",
      body: note
        ? `"${asset.title}" was not approved: ${note}`
        : `"${asset.title}" was not approved. Review and resubmit.`,
      link: "/dashboard/uploads",
    });
  } else if (status === "NEEDS_IMPROVEMENT") {
    // Softer than REJECTED — the asset is still a candidate, just needs
    // a revision pass. The link points straight at the edit form so the
    // creator can act on the admin's note immediately.
    await createNotification({
      userId: asset.uploaderId,
      type: "ASSET_NEEDS_IMPROVEMENT",
      title: "Asset needs improvement",
      body: note
        ? `"${asset.title}" needs some changes before it can go live: ${note}`
        : `"${asset.title}" needs some changes before it can go live.`,
      link: `/dashboard/uploads/${asset.id}/edit`,
    });
  }

  // Bust the Explore page's ISR cache so admin approval is reflected instantly
  // — without this we'd be stuck waiting for the revalidate window to lapse.
  // Next 16 requires a cache profile; `{ expire: 0 }` invalidates immediately.
  revalidateTag("assets", { expire: 0 });

  return NextResponse.json({ ok: true, status: asset.status });
}
