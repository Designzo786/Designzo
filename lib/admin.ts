import { auth } from "./auth";
import { prisma } from "./prisma";
import { redirect } from "next/navigation";

/**
 * Server-side admin guard. Returns the session for an authenticated ADMIN,
 * otherwise redirects. Use in admin pages and server actions.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/");
  return session;
}

/**
 * Same guard for API routes — returns the session or `null` so the caller
 * can return a 401/403 instead of redirecting.
 */
export async function getAdminSession() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

interface LogInput {
  adminId: string;
  action: string;
  targetId: string;
  targetType: "ASSET" | "USER" | "PAYOUT";
  note?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAdminLog(input: LogInput) {
  await prisma.adminLog.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      targetId: input.targetId,
      targetType: input.targetType,
      note: input.note,
      metadata: input.metadata as never,
    },
  });
}
