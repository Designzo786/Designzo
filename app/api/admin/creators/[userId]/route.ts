import { NextResponse } from "next/server";
import { getAdminSession, writeAdminLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

type Action = "APPROVE" | "REJECT";

/**
 * Admin decides (or revisits) a Collaborator application.
 *
 *   APPROVE → role becomes CREATOR, creatorStatus APPROVED. Uploads unlock.
 *             Valid from any prior state — covers approving a fresh PENDING
 *             application AND reviving a previously-REJECTED one (second chance).
 *
 *   REJECT  → creatorStatus REJECTED. If the target was CREATOR, role is
 *             demoted back to USER so the upload tools relock immediately.
 *             Existing approved assets stay published — buyers paid for them
 *             — but no new uploads.
 *             Valid from any prior state — covers rejecting a fresh PENDING
 *             application AND revoking a previously-APPROVED collaborator.
 *
 * Admins promoted to ADMIN role are never demoted by this route, even if
 * an admin tries to "reject" them — admin role outranks creator status.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { userId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { action } = (body ?? {}) as { action?: Action };
  if (action !== "APPROVE" && action !== "REJECT") {
    return NextResponse.json(
      { error: "Action must be APPROVE or REJECT." },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { creatorStatus: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (target.creatorStatus === "NONE") {
    return NextResponse.json(
      { error: "This account never applied to be a collaborator." },
      { status: 400 }
    );
  }
  if (target.creatorStatus === action.replace("APPROVE", "APPROVED").replace("REJECT", "REJECTED")) {
    // Already in the requested state — no-op success rather than an error.
    return NextResponse.json({ ok: true, alreadyInState: true });
  }

  await prisma.user.update({
    where: { id: userId },
    data:
      action === "APPROVE"
        ? {
            // Don't demote an admin to creator — leave admin role intact.
            role: target.role === "ADMIN" ? undefined : "CREATOR",
            creatorStatus: "APPROVED",
            creatorDecidedAt: new Date(),
          }
        : {
            // Revoking access: demote CREATOR → USER so upload tools relock.
            // ADMIN role is never demoted from here.
            role: target.role === "CREATOR" ? "USER" : undefined,
            creatorStatus: "REJECTED",
            creatorDecidedAt: new Date(),
          },
  });

  // Distinguish a fresh decision from a revoke / revive so the audit log
  // and the user-facing notification both reflect what really happened.
  const wasPreviouslyDecided = target.creatorStatus !== "PENDING";

  await writeAdminLog({
    adminId: session.user.id,
    action:
      action === "APPROVE"
        ? wasPreviouslyDecided
          ? "CREATOR_REINSTATE"
          : "CREATOR_APPROVE"
        : wasPreviouslyDecided
          ? "CREATOR_REVOKE"
          : "CREATOR_REJECT",
    targetId: userId,
    targetType: "USER",
  });

  if (action === "APPROVE") {
    await createNotification({
      userId,
      type: "CREATOR_APPROVED",
      title: wasPreviouslyDecided
        ? "Collaborator access restored"
        : "You're a Collaborator!",
      body: wasPreviouslyDecided
        ? "Your collaborator access has been restored — you can upload and sell assets again."
        : "Your creator account is approved — you can now upload and sell assets.",
      link: "/dashboard/uploads/new",
    });
  } else {
    await createNotification({
      userId,
      type: "CREATOR_REJECTED",
      title: wasPreviouslyDecided
        ? "Collaborator access revoked"
        : "Collaborator application declined",
      body: wasPreviouslyDecided
        ? "Your collaborator privileges have been revoked. Your existing assets stay published, but new uploads are disabled. Reach out via the contact page if you have questions."
        : "Your request to become a creator was not approved. Reach out via the contact page if you have questions.",
      link: "/contact",
    });
  }

  return NextResponse.json({ ok: true });
}
