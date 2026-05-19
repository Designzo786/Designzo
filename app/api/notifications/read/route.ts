import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Marks notifications as read for the signed-in user.
 *   - body `{ id }`  → marks that single notification read
 *   - body `{}`      → marks ALL of the user's notifications read
 *
 * The `userId` filter is always applied, so a user can never mark another
 * user's notifications by guessing an id.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty body is valid — means "mark all"
  }

  const { id } = (body ?? {}) as { id?: string };

  const result = await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      read: false,
      ...(id ? { id } : {}),
    },
    data: { read: true },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
