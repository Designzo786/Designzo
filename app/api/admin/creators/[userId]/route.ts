import { NextResponse } from "next/server";
import { getAdminSession, writeAdminLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

type Action = "APPROVE" | "REJECT";

/**
 * Admin decides a pending Collaborator application.
 *   APPROVE → role becomes CREATOR, creatorStatus APPROVED — upload tools unlock.
 *   REJECT  → creatorStatus REJECTED, role stays USER.
 * Either way the applicant gets a notification.
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
    select: { creatorStatus: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (target.creatorStatus !== "PENDING") {
    return NextResponse.json(
      {
        error: `This account is not awaiting review (current state: ${target.creatorStatus}).`,
      },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data:
      action === "APPROVE"
        ? {
            role: "CREATOR",
            creatorStatus: "APPROVED",
            creatorDecidedAt: new Date(),
          }
        : {
            creatorStatus: "REJECTED",
            creatorDecidedAt: new Date(),
          },
  });

  await writeAdminLog({
    adminId: session.user.id,
    action: action === "APPROVE" ? "CREATOR_APPROVE" : "CREATOR_REJECT",
    targetId: userId,
    targetType: "USER",
  });

  if (action === "APPROVE") {
    await createNotification({
      userId,
      type: "CREATOR_APPROVED",
      title: "You're a Collaborator!",
      body: "Your creator account is approved — you can now upload and sell assets.",
      link: "/dashboard/uploads/new",
    });
  } else {
    await createNotification({
      userId,
      type: "CREATOR_REJECTED",
      title: "Collaborator application declined",
      body: "Your request to become a creator was not approved. Reach out via the contact page if you have questions.",
      link: "/contact",
    });
  }

  return NextResponse.json({ ok: true });
}
