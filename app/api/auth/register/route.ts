import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { maybePromoteAdmin } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { issueToken } from "@/lib/auth-tokens";
import { sendEmail, renderVerifyEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Rate limit: 5 registrations per hour per IP. Stops a single attacker
  // from creating thousands of fake accounts to mine email addresses.
  const rl = checkRateLimit(req, "register", {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { name, email, password, acceptedTerms, accountType } = (body ??
    {}) as {
    name?: string;
    email?: string;
    password?: string;
    acceptedTerms?: boolean;
    accountType?: string;
  };

  // A Collaborator signup does NOT become a CREATOR immediately — the account
  // is created as a plain USER with creatorStatus PENDING and waits for an
  // admin to approve it. A regular signup has creatorStatus NONE.
  const isCollaborator = accountType === "collaborator";

  // Validation
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json(
      { error: "Please enter a valid name." },
      { status: 400 }
    );
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (password.length > 128 || name.length > 100 || email.length > 254) {
    return NextResponse.json(
      { error: "Input too long." },
      { status: 400 }
    );
  }
  if (acceptedTerms !== true) {
    return NextResponse.json(
      { error: "You must accept the Terms of Service and Privacy Policy." },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        creatorStatus: isCollaborator ? "PENDING" : "NONE",
        acceptedTermsAt: new Date(),
        // role stays the schema default (USER); collaborators are promoted
        // to CREATOR only on admin approval.
      },
      select: { id: true, email: true, name: true },
    });

    // Auto-promote to ADMIN if the email matches ADMIN_EMAIL.
    await maybePromoteAdmin(user.email, "USER");

    // Send verification email — best-effort; account creation still succeeds
    // if email fails (user can hit "resend" later).
    try {
      const secret = await issueToken("verify", user.email);
      const baseUrl =
        process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const verifyUrl = `${baseUrl}/verify-email?email=${encodeURIComponent(user.email)}&token=${secret}`;
      const { subject, html } = renderVerifyEmail(user.name ?? "there", verifyUrl);
      await sendEmail({ to: user.email, subject, html });
    } catch (err) {
      console.error("[register] verification email failed:", err);
    }

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err) {
    console.error("[register] failed:", err);
    return NextResponse.json(
      { error: "Could not create account. Please try again." },
      { status: 500 }
    );
  }
}
