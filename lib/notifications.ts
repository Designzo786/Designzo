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
