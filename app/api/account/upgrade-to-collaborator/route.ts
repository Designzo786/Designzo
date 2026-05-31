import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Lets a plain USER account apply to become a Collaborator without going
 * through the register form. Flips `creatorStatus` to PENDING — an admin
 * reviews and approves from /admin/creators.
 *
 * Allowed transitions:
 *   NONE      → PENDING   (first-time upgrade)
 *   REJECTED  → PENDING   (re-apply after a previous decline)
 *
 * Blocked transitions:
 *   PENDING   — already waiting on a decision
 *   APPROVED  — already a Collaborator (role would be CREATOR)
 *
 * ADMIN accounts are also blocked from this flow because they don't need it
 * and accidentally hitting it would be confusing.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Rate limit: 5/hour/IP. Stops a bored user (or a bot) from spamming
  // the admin queue.
  const rl = checkRateLimit(req, "upgrade-collaborator", {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, creatorStatus: true },
  });
  if (!me) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (me.role === "ADMIN") {
    return NextResponse.json(
      { error: "Admins don't need to apply as collaborators." },
      { status: 400 }
    );
  }
  if (me.role === "CREATOR" || me.creatorStatus === "APPROVED") {
    return NextResponse.json(
      { error: "You're already a Collaborator." },
      { status: 400 }
    );
  }
  if (me.creatorStatus === "PENDING") {
    return NextResponse.json(
      { error: "Your application is already pending review." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      creatorStatus: "PENDING",
      // Clear the prior decision timestamp so admin tooling correctly treats
      // this as a fresh application, not a stale one.
      creatorDecidedAt: null,
    },
  });

  return NextResponse.json({ ok: true, status: "PENDING" });
}
