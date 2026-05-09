import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/auth-tokens";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rl = checkRateLimit(req, "reset-password", {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, token, password } = (body ?? {}) as {
    email?: string;
    token?: string;
    password?: string;
  };

  if (!email || !token || !password) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { error: "Password must be 8–128 characters." },
      { status: 400 }
    );
  }

  const result = await consumeToken("reset", email, token);
  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.reason === "expired"
            ? "This reset link has expired. Request a new one."
            : "Invalid or already-used reset link.",
      },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { email: result.email },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
