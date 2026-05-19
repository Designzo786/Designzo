import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeToken, issueToken } from "@/lib/auth-tokens";
import { sendEmail, renderVerifyEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Consume a verification token and mark the user's email as verified.
 * Called by the verify-email page (client component) after the user lands
 * from the email link.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, token } = (body ?? {}) as { email?: string; token?: string };
  if (!email || !token) {
    return NextResponse.json({ error: "Missing email or token" }, { status: 400 });
  }

  const result = await consumeToken("verify", email, token);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason === "expired" ? "Link expired" : "Invalid link" },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { email: result.email },
    data: { emailVerified: new Date() },
    select: { creatorStatus: true },
  });

  // The success screen shows a different message for collaborators whose
  // account still needs admin approval.
  return NextResponse.json({
    ok: true,
    pendingCreator: user.creatorStatus === "PENDING",
  });
}

/**
 * Re-issue a verification email. Useful when the original expired or the
 * user lost the email. Idempotent — overwrites any existing token.
 */
export async function PUT(req: Request) {
  const rl = checkRateLimit(req, "verify-email-resend", {
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
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { email: true, name: true, emailVerified: true },
  });

  // Always return ok — don't leak whether an account exists.
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  try {
    const secret = await issueToken("verify", user.email);
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify-email?email=${encodeURIComponent(user.email)}&token=${secret}`;
    const { subject, html } = renderVerifyEmail(user.name ?? "there", verifyUrl);
    await sendEmail({ to: user.email, subject, html });
  } catch (err) {
    console.error("[verify-resend] failed:", err);
  }

  return NextResponse.json({ ok: true });
}
