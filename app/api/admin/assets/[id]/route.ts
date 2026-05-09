import { NextResponse } from "next/server";
import { getAdminSession, writeAdminLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { AssetStatus } from "@prisma/client";

export const runtime = "nodejs";

const VALID: AssetStatus[] = ["PENDING", "APPROVED", "REJECTED"];

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

  const asset = await prisma.asset.update({
    where: { id },
    data: {
      status,
      rejectionNote: status === "REJECTED" ? (note ?? null) : null,
    },
    select: { id: true, status: true },
  });

  await writeAdminLog({
    adminId: session.user.id,
    action: `${status}_ASSET`,
    targetId: asset.id,
    targetType: "ASSET",
    note,
  });

  return NextResponse.json({ ok: true, status: asset.status });
}
