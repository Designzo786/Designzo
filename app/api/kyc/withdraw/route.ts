import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Withdraw a pending KYC submission. Sets status back to UNVERIFIED so the
 * user can edit and resubmit. Documents stay on disk — they're cleaned up
 * on the next submission, or if the user is deleted.
 */
export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { kycStatus: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (user.kycStatus !== "PENDING") {
    return NextResponse.json(
      { error: "Only pending submissions can be withdrawn." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      kycStatus: "UNVERIFIED",
      kycSubmittedAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
