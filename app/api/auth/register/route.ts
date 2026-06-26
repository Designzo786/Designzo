import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { maybePromoteAdmin } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendWelcomeNotification } from "@/lib/notifications";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Rate limit: 5 registrations per hour per IP. Stops a single attacker
  // from creating thousands of fake accounts to mine email addresses.
  const rl = await checkRateLimit(req, "register", {
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
    // Pre-hash the password BEFORE checking the DB. bcrypt 12-round is ~250ms
    // and pure CPU work — if Neon happens to be cold-starting, doing this here
    // gives the DB time to wake up so the lookup that follows is likely warm.
    const passwordHash = await bcrypt.hash(password, 12);

    const existing = await retryOnTransient(() =>
      prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      })
    );
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const user = await retryOnTransient(() =>
      prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          // Accounts are pre-verified at registration — no email confirmation
          // gate. The credential authorize() flow doesn't check emailVerified
          // anyway, so this just keeps the column populated for any downstream
          // tooling that expects it (NextAuth's PrismaAdapter, audit queries).
          emailVerified: new Date(),
          creatorStatus: isCollaborator ? "PENDING" : "NONE",
          acceptedTermsAt: new Date(),
          // role stays the schema default (USER); collaborators are promoted
          // to CREATOR only on admin approval.
        },
        select: { id: true, email: true, name: true },
      })
    );

    // Auto-promote to ADMIN if the email matches ADMIN_EMAIL. Wrapped in
    // its own try/catch so a transient failure here doesn't roll back the
    // newly-created account — the user can sign in and the next sign-in
    // will run the bootstrap check again.
    await maybePromoteAdmin(user.email, "USER").catch((e) =>
      console.error("[register] admin promote check failed:", e)
    );

    // Welcome notification — fired as fire-and-forget so the response goes
    // out immediately. The helper already swallows its own errors. Awaiting
    // it would mean a slow Resend response or a cold-start DB read on the
    // notification row blocks the user from seeing "you're registered".
    void sendWelcomeNotification(user.id, isCollaborator).catch((e) =>
      console.error("[register] welcome notification failed:", e)
    );

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err) {
    // P2002 — unique constraint violation. Happens when two register requests
    // for the same email race past our findUnique check. Treat it as a normal
    // "account already exists" so the UI matches the no-race path.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // P1001 (can't reach DB) / P2024 (connection timeout) — the Neon free
    // tier auto-suspends after idle and the wake-up sometimes outruns our
    // retry budget. Tell the user what's going on instead of a generic 500.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === "P1001" || err.code === "P2024")
    ) {
      console.error("[register] DB unreachable:", err.code);
      return NextResponse.json(
        {
          error:
            "The database is waking up — please try again in a few seconds.",
        },
        { status: 503 }
      );
    }
    if (err instanceof Prisma.PrismaClientInitializationError) {
      console.error("[register] Prisma init failed:", err.message);
      return NextResponse.json(
        {
          error:
            "The database is waking up — please try again in a few seconds.",
        },
        { status: 503 }
      );
    }

    console.error("[register] failed:", err);
    return NextResponse.json(
      { error: "Could not create account. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Retry a Prisma operation once if the first attempt hits a transient
 * connectivity error. Catches the Neon-cold-start failure mode where the
 * compute is mid-resume and the first query lands a fraction of a second
 * before the server is ready. A 500ms backoff is enough in practice.
 */
async function retryOnTransient<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (err) {
    const transient =
      (err instanceof Prisma.PrismaClientKnownRequestError &&
        (err.code === "P1001" || err.code === "P2024")) ||
      err instanceof Prisma.PrismaClientInitializationError;
    if (!transient) throw err;
    await new Promise((r) => setTimeout(r, 500));
    return op();
  }
}
