import { NextResponse } from "next/server";
import { getAdminSession, writeAdminLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createNotification, createNotifications } from "@/lib/notifications";
import { formatMoney } from "@/lib/utils";
import type { PurchaseStatus } from "@prisma/client";

export const runtime = "nodejs";

const VALID: PurchaseStatus[] = ["PENDING", "COMPLETED", "REFUNDED"];

/**
 * Admin manually sets a user's purchase (payment) status.
 *
 *   → COMPLETED : the payment counts as paid — the buyer gets the asset in
 *                 their library and the creator is credited their earning.
 *   → PENDING / REFUNDED : the payment is treated as not paid — access is
 *                 revoked and, if the creator was previously credited, the
 *                 earning is taken back off their balance.
 *
 * The creator-balance adjustment runs in the same transaction as the status
 * change, so the two can never drift apart.
 */
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

  const { status } = (body ?? {}) as { status?: PurchaseStatus };
  if (!status || !VALID.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const existing = await prisma.purchase.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      creatorEarning: true,
      buyerId: true,
      asset: { select: { title: true, uploaderId: true } },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
  }

  if (existing.status === status) {
    return NextResponse.json({ ok: true, status });
  }

  const wasPaid = existing.status === "COMPLETED";
  const nowPaid = status === "COMPLETED";
  const uploaderId = existing.asset.uploaderId;
  const earning = existing.creatorEarning;

  await prisma.$transaction(async (tx) => {
    await tx.purchase.update({ where: { id }, data: { status } });

    if (!wasPaid && nowPaid && earning > 0) {
      // Crediting the creator for a newly-confirmed payment.
      await tx.user.update({
        where: { id: uploaderId },
        data: { balance: { increment: earning } },
      });
    } else if (wasPaid && !nowPaid && earning > 0) {
      // Reversing a credit. Clamp at 0 — the creator may have already
      // withdrawn the earning, and a negative balance would be confusing.
      const creator = await tx.user.findUnique({
        where: { id: uploaderId },
        select: { balance: true },
      });
      await tx.user.update({
        where: { id: uploaderId },
        data: { balance: Math.max(0, (creator?.balance ?? 0) - earning) },
      });
    }
  });

  await writeAdminLog({
    adminId: session.user.id,
    action: `PURCHASE_${status}`,
    targetId: id,
    targetType: "PURCHASE",
  });

  const title = existing.asset.title;
  if (!wasPaid && nowPaid) {
    await createNotifications([
      {
        userId: existing.buyerId,
        type: "PURCHASE",
        title: "Payment confirmed",
        body: `Your payment for "${title}" was confirmed — it's now in your library.`,
        link: "/dashboard/library",
      },
      {
        userId: uploaderId,
        type: "SALE",
        title: "You made a sale!",
        body: `"${title}" was purchased — ${formatMoney(earning)} added to your balance.`,
        link: "/dashboard/earnings",
      },
    ]);
  } else if (wasPaid && !nowPaid) {
    await createNotification({
      userId: existing.buyerId,
      type: "PURCHASE",
      title: "Purchase updated",
      body: `Your purchase of "${title}" was marked as ${status.toLowerCase()} — access has been removed.`,
      link: "/dashboard/library",
    });
  }

  return NextResponse.json({ ok: true, status });
}
