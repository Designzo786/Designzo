import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { flags } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness + readiness probe for uptime monitors, Vercel health checks,
 * and operator smoke-testing after a deploy.
 *
 * The endpoint:
 *   - Returns 200 when the app can reach Postgres AND R2 is configured.
 *   - Returns 503 when any dependency is unreachable, with a body that
 *     names the failing subsystem so the operator can act without
 *     digging through logs.
 *   - Never leaks credentials, version metadata, or env values — only
 *     boolean / shallow status strings.
 *
 * Heavy enough to detect real outages (round-trips to the DB) but
 * cheap enough to poll on a 30s interval without straining the
 * connection pool.
 */
export async function GET() {
  const checks: Record<string, "up" | "down" | "skipped"> = {
    database: "skipped",
    storage: "skipped",
  };
  let allUp = true;

  // ── Postgres ──────────────────────────────────────────────────────
  try {
    // Lightest possible query — Prisma's "$queryRaw SELECT 1" round-
    // trips the connection without scanning any table.
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "up";
  } catch (err) {
    checks.database = "down";
    allUp = false;
    console.error("[health] database down:", err);
  }

  // ── R2 storage (config presence; full HEAD would cost an API call) ──
  // We don't ping R2 itself here — a 401 from a misconfigured R2 token
  // would otherwise flap the probe on every poll. Probes that actually
  // need to verify R2 connectivity (e.g. release gates) can hit the
  // signed-URL route directly.
  if (flags.hasR2) {
    checks.storage = "up";
  } else {
    checks.storage = "down";
    allUp = false;
  }

  return NextResponse.json(
    {
      ok: allUp,
      checks,
      // Server-side timestamp lets an operator distinguish "stuck cache
      // serving a stale response" from "actually just queried right now".
      timestamp: new Date().toISOString(),
    },
    {
      status: allUp ? 200 : 503,
      headers: {
        // Never cache — every probe must hit the runtime so a freshly
        // borked deploy starts failing immediately, not after a TTL.
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
