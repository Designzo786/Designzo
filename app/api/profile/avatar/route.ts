import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savePublic, deletePublic } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3 MB

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not parse upload." },
      { status: 400 }
    );
  }

  const file = form.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Please choose an image." },
      { status: 400 }
    );
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      { error: "Avatar exceeds 3 MB limit." },
      { status: 400 }
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Avatar must be a PNG, JPEG, or WebP image." },
      { status: 400 }
    );
  }

  // Look up the existing avatar so we can delete it after a successful save.
  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true, avatarKey: true },
  });

  let savedUrl: string | null = null;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const saved = await savePublic(
      `avatars/${session.user.id}`,
      file.name || "avatar.png",
      buf
    );
    savedUrl = saved.url;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: saved.url, avatarKey: saved.url },
    });

    // Best-effort cleanup of the old avatar (only if we previously uploaded
    // it ourselves — never touch OAuth provider URLs that start with http).
    if (existing?.avatarKey && existing.avatarKey.startsWith("/uploads/")) {
      await deletePublic(existing.avatarKey);
    }

    return NextResponse.json({ url: saved.url });
  } catch (err) {
    if (savedUrl) await deletePublic(savedUrl);
    console.error("[avatar upload] failed:", err);
    return NextResponse.json(
      { error: "Could not save avatar. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarKey: true },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: null, avatarKey: null },
  });

  if (existing?.avatarKey && existing.avatarKey.startsWith("/uploads/")) {
    await deletePublic(existing.avatarKey);
  }

  return NextResponse.json({ ok: true });
}
