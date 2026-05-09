import { NextResponse } from "next/server";
import { getAdminSession, writeAdminLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Action = "VERIFY" | "REJECT";

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

  const { action, note } = (body ?? {}) as { action?: Action; note?: string };

  if (action !== "VERIFY" && action !== "REJECT") {
    return NextResponse.json(
      { error: "Action must be VERIFY or REJECT." },
      { status: 400 }
    );
  }

  if (action === "REJECT") {
    if (typeof note !== "string" || note.trim().length < 10) {
      return NextResponse.json(
        { error: "Rejection note must be at least 10 characters." },
        { status: 400 }
      );
    }
    if (note.length > 500) {
      return NextResponse.json(
        { error: "Rejection note is too long (max 500 chars)." },
        { status: 400 }
      );
    }
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { kycStatus: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (target.kycStatus !== "PENDING") {
    return NextResponse.json(
      { error: `Cannot decide a submission in ${target.kycStatus} state.` },
      { status: 400 }
    );
  }

  const now = new Date();
  await prisma.user.update({
    where: { id: userId },
    data:
      action === "VERIFY"
        ? {
            kycStatus: "VERIFIED",
            kycVerifiedAt: now,
            kycRejectionNote: null,
          }
        : {
            kycStatus: "REJECTED",
            kycRejectionNote: note!.trim(),
            kycVerifiedAt: null,
          },
  });

  await writeAdminLog({
    adminId: session.user.id,
    action: action === "VERIFY" ? "KYC_VERIFY" : "KYC_REJECT",
    targetId: userId,
    targetType: "USER",
    note: action === "REJECT" ? note?.trim() : undefined,
  });

  return NextResponse.json({ ok: true });
}
