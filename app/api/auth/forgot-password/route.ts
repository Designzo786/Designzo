import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueToken } from "@/lib/auth-tokens";
import { sendEmail, renderResetEmail } from "@/lib/email";
import { getPublicBaseUrl } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Rate limit: 3 reset requests per hour per IP. Stops mass-mailing.
  const rl = checkRateLimit(req, "forgot-password", {
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email } = (body ?? {}) as { email?: string };
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email." },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Look up the user — but ALWAYS return success regardless. We don't want
  // to leak which emails are registered. The email just won't actually go
  // out if the user doesn't exist.
  const user = await prisma.user
    .findUnique({
      where: { email: normalizedEmail },
      select: { email: true, name: true, passwordHash: true },
    })
    .catch(() => null);

  if (user && user.passwordHash) {
    try {
      const secret = await issueToken("reset", user.email);
      const resetUrl = `${getPublicBaseUrl()}/reset-password?email=${encodeURIComponent(user.email)}&token=${secret}`;
      const { subject, html } = renderResetEmail(user.name ?? "there", resetUrl);
      await sendEmail({ to: user.email, subject, html });
    } catch (err) {
      console.error("[forgot-password] email send failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
