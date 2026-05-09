import { NextResponse } from "next/server";
import { getAdminSession, writeAdminLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { PayoutStatus } from "@prisma/client";

export const runtime = "nodejs";

const VALID: PayoutStatus[] = ["PENDING", "PROCESSING", "PAID", "FAILED"];

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

  const { status, failureReason } = (body ?? {}) as {
    status?: PayoutStatus;
    failureReason?: string;
  };

  if (!status || !VALID.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  await prisma.payout.update({
    where: { id },
    data: {
      status,
      failureReason: status === "FAILED" ? (failureReason ?? null) : null,
    },
  });

  await writeAdminLog({
    adminId: session.user.id,
    action: `PAYOUT_${status}`,
    targetId: id,
    targetType: "PAYOUT",
    note: failureReason,
  });

  return NextResponse.json({ ok: true });
}
