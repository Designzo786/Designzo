import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Deletes a single notification belonging to the signed-in user.
 * The userId filter on deleteMany makes guessing an id of another user's
 * notification harmless — the delete simply matches zero rows.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const result = await prisma.notification.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Notification not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
