/**
 * In-app + email notification helpers.
 *
 * Every notification is delivered TWO ways:
 *   1. An in-app Notification row (the navbar bell).
 *   2. An email to the user's address, via Resend.
 *
 * Both are best-effort: a failure in either path is logged and swallowed so
 * it never breaks the operation that triggered the notification (an asset
 * approval, a completed purchase, a payout update, …). Callers fire-and-forget.
 */
import { prisma } from "./prisma";
import { sendEmail, renderNotificationEmail } from "./email";
import { getPublicBaseUrl } from "./env";
import type { NotificationType } from "@prisma/client";

interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

export async function createNotification(
  input: NotificationInput
): Promise<void> {
  // 1. In-app notification row.
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
      },
    });
  } catch (err) {
    console.error("[notifications] create failed:", err);
  }

  // 2. Email twin — look up the recipient and send.
  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, name: true },
    });
    if (user?.email) {
      // Notification links are app-relative; emails need an absolute URL.
      const absoluteLink = input.link
        ? `${getPublicBaseUrl()}${input.link}`
        : null;
      const { subject, html } = renderNotificationEmail(
        user.name ?? "there",
        input.type,
        input.title,
        input.body,
        absoluteLink
      );
      await sendEmail({ to: user.email, subject, html });
    }
  } catch (err) {
    console.error("[notifications] email failed:", err);
  }
}

/**
 * Creates several notifications at once (e.g. notifying a buyer and a creator
 * about the same sale). Runs them in parallel; each still delivers in-app
 * and by email, best-effort.
 */
export async function createNotifications(
  inputs: NotificationInput[]
): Promise<void> {
  await Promise.all(inputs.map((i) => createNotification(i)));
}

/**
 * Fires the "Welcome to Dezignxo" notification on first signup.
 *
 * Called from BOTH auth entry points so every new account gets it exactly
 * once regardless of which path they used:
 *   • Credential register   → app/api/auth/register/route.ts
 *   • Google OAuth sign-up  → events.createUser in lib/auth.ts
 *
 * The double cast to NotificationType is a temporary workaround for the
 * Prisma client lag — the DB enum already includes "WELCOME" (applied via
 * migration 20260531023710_add_welcome_notification_type), but a running
 * Next dev server can hold the Prisma DLL and stop `prisma generate` from
 * refreshing the TS types. Once `npx prisma generate` runs cleanly, the
 * cast becomes a redundant identity assertion.
 */
export async function sendWelcomeNotification(
  userId: string,
  isCollaborator = false
): Promise<void> {
  await createNotification({
    userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: "WELCOME" as any,
    title: "Welcome to Dezignxo 🎉",
    body: isCollaborator
      ? "Thanks for joining as a Collaborator. Once an admin approves your application, you can start uploading and selling premium 3D assets."
      : "Thanks for joining. Browse the marketplace, save assets to your wishlist, and buy what you love.",
    link: isCollaborator ? "/dashboard" : "/explore",
  });
}
