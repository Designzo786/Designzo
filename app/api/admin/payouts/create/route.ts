import { NextResponse } from "next/server";
import { getAdminSession, writeAdminLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Admin starts a payout for a creator without waiting for the creator to
 * request one. Drains the creator's whole balance into a new PENDING Payout,
 * which then flows through the normal admin queue (Mark processing / paid).
 *
 * Unlike the creator-initiated request, there's no minimum-amount floor —
 * the admin can clear any balance.
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

  const { creatorId } = (body ?? {}) as { creatorId?: string };
  if (!creatorId || typeof creatorId !== "string") {
    return NextResponse.json(
      { error: "creatorId is required." },
      { status: 400 }
    );
  }

  const creator = await prisma.user.findUnique({
    where: { id: creatorId },
    select: { id: true, balance: true },
  });
  if (!creator) {
    return NextResponse.json({ error: "Creator not found." }, { status: 404 });
  }
  if (creator.balance <= 0) {
    return NextResponse.json(
      { error: "This creator has no withdrawable balance." },
      { status: 400 }
    );
  }

  // One payout in flight at a time — a PENDING/PROCESSING payout already
  // holds the creator's drained balance.
  const inflight = await prisma.payout.findFirst({
    where: { creatorId, status: { in: ["PENDING", "PROCESSING"] } },
    select: { id: true },
  });
  if (inflight) {
    return NextResponse.json(
      { error: "This creator already has a payout in progress." },
      { status: 409 }
    );
  }

  try {
    const payout = await prisma.$transaction(async (tx) => {
      // Re-read inside the transaction to defend against a racing balance
      // change between the check above and the drain.
      const current = await tx.user.findUniqueOrThrow({
        where: { id: creatorId },
        select: { balance: true },
      });
      if (current.balance <= 0) {
        throw new Error("Balance changed — please retry.");
      }
      const created = await tx.payout.create({
        data: { creatorId, amount: current.balance, status: "PENDING" },
        select: { id: true, amount: true },
      });
      await tx.user.update({
        where: { id: creatorId },
        data: { balance: 0 },
      });
      return created;
    });

    await writeAdminLog({
      adminId: session.user.id,
      action: "PAYOUT_CREATED",
      targetId: payout.id,
      targetType: "PAYOUT",
    });

    return NextResponse.json({
      ok: true,
      payoutId: payout.id,
      amount: payout.amount,
    });
  } catch (err) {
    console.error("[admin/payouts/create] failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not create the payout.",
      },
      { status: 500 }
    );
  }
}
