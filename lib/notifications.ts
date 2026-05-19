/**
 * In-app notification helpers.
 *
 * `createNotification` is intentionally best-effort: a failed notification
 * insert must never break the operation that triggered it (an asset approval,
 * a completed purchase, a payout update). All failures are logged and
 * swallowed, so callers can fire-and-forget.
 */
import { prisma } from "./prisma";
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
}

/**
 * Creates many notifications at once (e.g. notifying a buyer and a creator
 * about the same sale). Best-effort, like the single-row helper.
 */
export async function createNotifications(
  inputs: NotificationInput[]
): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: inputs.map((i) => ({
        userId: i.userId,
        type: i.type,
        title: i.title,
        body: i.body,
        link: i.link ?? null,
      })),
    });
  } catch (err) {
    console.error("[notifications] createMany failed:", err);
  }
}
