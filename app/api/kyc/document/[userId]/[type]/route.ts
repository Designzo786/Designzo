import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readPrivate } from "@/lib/storage";

export const runtime = "nodejs";

type DocType = "aadhaar-front" | "aadhaar-back" | "pan";

const VALID_TYPES: DocType[] = ["aadhaar-front", "aadhaar-back", "pan"];

const KEY_FIELD: Record<DocType, "aadhaarKey" | "aadhaarBackKey" | "panKey"> = {
  "aadhaar-front": "aadhaarKey",
  "aadhaar-back": "aadhaarBackKey",
  pan: "panKey",
};

/**
 * Stream a KYC document image. Access is restricted to:
 *   - The user themselves (so they can review what they uploaded)
 *   - Admins (for verification review)
 *
 * No public access. No signed URLs are issued — every access goes through
 * this auth check.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string; type: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { userId, type } = await params;

  if (!VALID_TYPES.includes(type as DocType)) {
    return NextResponse.json(
      { error: "Invalid document type." },
      { status: 400 }
    );
  }

  const isOwner = userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aadhaarKey: true, aadhaarBackKey: true, panKey: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const key = user[KEY_FIELD[type as DocType]];
  if (!key) {
    return NextResponse.json({ error: "Document not uploaded." }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await readPrivate(key);
  } catch (err) {
    console.error("[kyc doc] read failed:", err);
    return NextResponse.json(
      { error: "Document could not be read." },
      { status: 500 }
    );
  }

  // Detect type from extension on the stored key
  const ext = key.split(".").pop()?.toLowerCase();
  const contentType =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : "image/jpeg";

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
      // Sensitive PII — never cache, never share between users
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
