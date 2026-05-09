import { NextResponse } from "next/server";
import { getAdminSession, writeAdminLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export const runtime = "nodejs";

const VALID: Role[] = ["USER", "CREATOR", "ADMIN"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  // Don't allow self-demotion: prevents accidentally locking the only admin
  // out of the panel.
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "You cannot change your own role." },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { role } = (body ?? {}) as { role?: Role };
  if (!role || !VALID.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id },
    data: { role },
  });

  await writeAdminLog({
    adminId: session.user.id,
    action: `SET_ROLE_${role}`,
    targetId: id,
    targetType: "USER",
  });

  return NextResponse.json({ ok: true });
}
