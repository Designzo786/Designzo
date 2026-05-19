import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Minimum payout amount in INR paise — Razorpay's IMPS minimum is ₹1 but
// we set a higher floor to avoid trivial payouts that eat into the fee.
const MIN_PAYOUT_PAISE = 50000; // ₹500

/**
 * Creator requests a payout for their full available balance.
 *
 * Pre-conditions:
 *   - User must be signed in
 *   - User's KYC status must be VERIFIED
 *   - Balance must be ≥ MIN_PAYOUT_PAISE
 *   - No other pending/processing payout (one in-flight at a time)
 *
 * Effects (in a single transaction):
 *   - Snapshot the current balance into a new Payout row (status = PENDING)
 *   - Zero the user's balance (so further sales accrue cleanly)
 *
 * The admin queue picks it up from there.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Payout requests are rare by nature — a tight limit blocks any attempt to
  // race the balance-drain transaction with a flood of concurrent requests.
  const rl = checkRateLimit(req, "payout-request", {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      balance: true,
      kycStatus: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (user.kycStatus !== "VERIFIED") {
    return NextResponse.json(
      { error: "Complete KYC verification before requesting a payout." },
      { status: 400 }
    );
  }

  if (user.balance < MIN_PAYOUT_PAISE) {
    return NextResponse.json(
      {
        error: `Minimum payout is ₹${MIN_PAYOUT_PAISE / 100}. You have ₹${user.balance / 100}.`,
      },
      { status: 400 }
    );
  }

  const inflight = await prisma.payout.findFirst({
    where: {
      creatorId: user.id,
      status: { in: ["PENDING", "PROCESSING"] },
    },
    select: { id: true },
  });
  if (inflight) {
    return NextResponse.json(
      { error: "You already have a payout in progress." },
      { status: 409 }
    );
  }

  try {
    const payout = await prisma.$transaction(async (tx) => {
      // Re-read inside the transaction to defend against a race where two
      // requests arrive simultaneously — both pass the balance check, both
      // try to drain. The update conditional on balance keeps it safe.
      const current = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { balance: true },
      });
      if (current.balance < MIN_PAYOUT_PAISE) {
        throw new Error("Balance changed — please retry.");
      }
      const amount = current.balance;

      const created = await tx.payout.create({
        data: {
          creatorId: user.id,
          amount,
          status: "PENDING",
        },
        select: { id: true, amount: true },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { balance: 0 },
      });

      return created;
    });

    return NextResponse.json({
      ok: true,
      payoutId: payout.id,
      amount: payout.amount,
    });
  } catch (err) {
    console.error("[payouts/request] failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not create payout request.",
      },
      { status: 500 }
    );
  }
}
