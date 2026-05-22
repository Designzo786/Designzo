import { NextResponse } from "next/server";
import { getAdminSession, writeAdminLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  createRazorpayXPayout,
  isRazorpayXConfigured,
  mapRazorpayXStatus,
} from "@/lib/razorpay-payouts";
import { createNotification } from "@/lib/notifications";
import { formatPrice } from "@/lib/utils";
import type { PayoutStatus } from "@prisma/client";

export const runtime = "nodejs";

const VALID: PayoutStatus[] = ["PENDING", "PROCESSING", "PAID", "FAILED"];

/**
 * Admin transitions a payout through its lifecycle.
 *
 *   PENDING → PROCESSING: if RazorpayX is configured, fire the real payout
 *                         API call; otherwise just flip the status (admin
 *                         sends money manually in offline mode).
 *
 *   * → PAID:             final settled state. The admin records the bank
 *                         UTR / IMPS reference (`transactionRef`) so the
 *                         creator can reconcile the deposit on their
 *                         statement; we email it to them too.
 *
 *   * → FAILED:           admin marks a payout failed (e.g. RazorpayX
 *                         rejected, bank bounced). Refunds the amount back
 *                         to the creator's balance so they can retry.
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

  const { status, failureReason, transactionRef } = (body ?? {}) as {
    status?: PayoutStatus;
    failureReason?: string;
    transactionRef?: string;
  };

  if (!status || !VALID.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const existing = await prisma.payout.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      amount: true,
      creatorId: true,
      razorpayPayoutId: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Payout not found." }, { status: 404 });
  }

  // If we're moving to PROCESSING and RazorpayX is configured, kick off
  // the real API call before flipping the status. If the call fails, we
  // keep the row PENDING so admin can retry without losing money.
  let razorpayPayoutId: string | null = existing.razorpayPayoutId;
  let resolvedStatus: PayoutStatus = status;
  let resolvedFailureReason: string | null = null;

  if (
    status === "PROCESSING" &&
    isRazorpayXConfigured() &&
    !existing.razorpayPayoutId
  ) {
    try {
      const result = await createRazorpayXPayout({
        payoutId: existing.id,
        creatorId: existing.creatorId,
        amountInPaise: existing.amount,
      });
      razorpayPayoutId = result.razorpayPayoutId;
      resolvedStatus = mapRazorpayXStatus(result.status);
    } catch (err) {
      console.error("[admin/payouts] RazorpayX error:", err);
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "RazorpayX call failed.",
        },
        { status: 502 }
      );
    }
  }

  if (status === "FAILED") {
    resolvedFailureReason = failureReason ?? null;
  }

  // Trim and only persist the transaction reference when actually marking PAID.
  // Other transitions don't touch the field, so an earlier ref survives a
  // back-and-forth.
  const refToSave =
    resolvedStatus === "PAID"
      ? (transactionRef?.trim() || null)
      : undefined;

  // FAILED transitions need to credit the amount back to the creator's
  // balance so they don't permanently lose it. Bundle that with the
  // status update in a single transaction.
  if (status === "FAILED" && existing.status !== "FAILED") {
    await prisma.$transaction([
      prisma.payout.update({
        where: { id },
        data: {
          status: "FAILED",
          failureReason: resolvedFailureReason,
          razorpayPayoutId,
        },
      }),
      prisma.user.update({
        where: { id: existing.creatorId },
        data: { balance: { increment: existing.amount } },
      }),
    ]);
  } else {
    await prisma.payout.update({
      where: { id },
      data: {
        status: resolvedStatus,
        failureReason: resolvedFailureReason,
        razorpayPayoutId,
        ...(refToSave !== undefined ? { transactionRef: refToSave } : {}),
      },
    });
  }

  await writeAdminLog({
    adminId: session.user.id,
    action: `PAYOUT_${resolvedStatus}`,
    targetId: id,
    targetType: "PAYOUT",
    note:
      failureReason ??
      refToSave ??
      (razorpayPayoutId ? `RX: ${razorpayPayoutId}` : undefined),
  });

  // Keep the creator informed of where their payout stands.
  const amount = formatPrice(existing.amount);
  if (resolvedStatus === "PROCESSING") {
    await createNotification({
      userId: existing.creatorId,
      type: "PAYOUT_PROCESSING",
      title: "Payout processing",
      body: `Your payout of ${amount} is being processed.`,
      link: "/dashboard/earnings",
    });
  } else if (resolvedStatus === "PAID") {
    const refSuffix = refToSave ? ` Reference: ${refToSave}.` : "";
    // createNotification also emails the creator (in-app + email together).
    await createNotification({
      userId: existing.creatorId,
      type: "PAYOUT_PAID",
      title: "Payout sent",
      body: `${amount} has been sent to your registered bank account.${refSuffix}`,
      link: "/dashboard/earnings",
    });
  } else if (resolvedStatus === "FAILED") {
    await createNotification({
      userId: existing.creatorId,
      type: "PAYOUT_FAILED",
      title: "Payout failed",
      body: `Your payout of ${amount} could not be completed${
        resolvedFailureReason ? `: ${resolvedFailureReason}` : ""
      }. The amount was returned to your balance.`,
      link: "/dashboard/earnings",
    });
  }

  return NextResponse.json({ ok: true, status: resolvedStatus });
}
