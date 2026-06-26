import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const URL_RE = /^https?:\/\/[^\s]+$/i;

export async function PATCH(req: Request) {
  // 30 profile edits per hour per IP — generous, but stops scripted abuse.
  const rl = await checkRateLimit(req, "profile-update", {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { name, bio, website } = (body ?? {}) as {
    name?: string;
    bio?: string;
    website?: string;
  };

  if (typeof name !== "string" || name.trim().length < 2 || name.length > 100) {
    return NextResponse.json(
      { error: "Name must be 2–100 characters." },
      { status: 400 }
    );
  }
  if (typeof bio !== "string" || bio.length > 300) {
    return NextResponse.json(
      { error: "Bio must be 300 characters or less." },
      { status: 400 }
    );
  }
  if (typeof website !== "string" || website.length > 200) {
    return NextResponse.json(
      { error: "Website is too long." },
      { status: 400 }
    );
  }
  if (website.length > 0 && !URL_RE.test(website)) {
    return NextResponse.json(
      { error: "Website must be a valid http(s) URL." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name.trim(),
      bio: bio.trim() || null,
      website: website.trim() || null,
    },
  });

  return NextResponse.json({ ok: true });
}
