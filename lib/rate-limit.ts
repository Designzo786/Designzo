/**
 * Distributed rate limiter with a per-process in-memory fallback.
 *
 *   • Production: Upstash Redis (HTTPS REST). One shared sliding window
 *     across every Vercel function instance — the only configuration
 *     that actually limits a determined attacker on a multi-region
 *     serverless deployment.
 *   • Dev / unconfigured: per-process in-memory map. Still good enough
 *     for `npm run dev` and for low-traffic single-instance hosts that
 *     don't need cross-instance coordination.
 *
 * Backend is picked at first call based on `flags.hasUpstash` and the
 * choice is cached for the rest of the process lifetime. Switching
 * upstream (e.g. flipping UPSTASH env vars in Vercel) requires a
 * redeploy — fine, because the env-driven choice is intentional.
 *
 * Usage in an API route — same call shape as before, but now async:
 *
 *   const rl = await checkRateLimit(req, "register", { limit: 5, windowMs: 60_000 });
 *   if (!rl.ok) return rl.response;
 */

import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { flags, env } from "./env";

// ─── Shared types ────────────────────────────────────────────────────

interface CheckOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitOk {
  ok: true;
  remaining: number;
}

export interface RateLimitDenied {
  ok: false;
  response: NextResponse;
}

function getClientId(req: Request): string {
  // Vercel + most CDNs forward the real client IP via these headers.
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "anon";
}

function denyResponse(
  limit: number,
  retrySec: number,
  resetEpochSec: number
): NextResponse {
  const response = NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    { status: 429 }
  );
  response.headers.set("Retry-After", String(retrySec));
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", "0");
  response.headers.set("X-RateLimit-Reset", String(resetEpochSec));
  return response;
}

// ─── Upstash backend ─────────────────────────────────────────────────
// Limiter instances are cached per (limit, windowMs, scope) tuple so we
// don't construct a new Ratelimit on every request. Upstash's Ratelimit
// itself is stateless; the caching here is only to skip the
// `new Ratelimit(...)` allocation cost.

let _redis: Redis | null = null;
function getRedis(): Redis {
  if (_redis) return _redis;
  _redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL!,
    token: env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return _redis;
}

const upstashLimiters = new Map<string, Ratelimit>();
function getUpstashLimiter(scope: string, opts: CheckOptions): Ratelimit {
  const key = `${scope}:${opts.limit}:${opts.windowMs}`;
  let limiter = upstashLimiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis(),
      // Sliding window matches the in-memory backend's semantics so
      // production and dev behave identically modulo the storage.
      limiter: Ratelimit.slidingWindow(opts.limit, `${opts.windowMs} ms`),
      // Prefix every key so a future shared Redis with other services
      // can't accidentally collide.
      prefix: "dezignxo:rl",
      analytics: false,
    });
    upstashLimiters.set(key, limiter);
  }
  return limiter;
}

async function checkUpstash(
  req: Request,
  scope: string,
  opts: CheckOptions
): Promise<RateLimitOk | RateLimitDenied> {
  const clientId = getClientId(req);
  const limiter = getUpstashLimiter(scope, opts);
  const key = `${scope}:${clientId}`;
  const result = await limiter.limit(key);

  if (!result.success) {
    const retrySec = Math.max(0, Math.ceil((result.reset - Date.now()) / 1000));
    const resetEpochSec = Math.ceil(result.reset / 1000);
    return { ok: false, response: denyResponse(opts.limit, retrySec, resetEpochSec) };
  }
  return { ok: true, remaining: result.remaining };
}

// ─── In-memory backend (fallback) ────────────────────────────────────

interface Bucket {
  hits: number[];
}
const memoryStore = new Map<string, Bucket>();

function checkMemory(
  req: Request,
  scope: string,
  opts: CheckOptions
): RateLimitOk | RateLimitDenied {
  const clientId = getClientId(req);
  const key = `${scope}:${clientId}`;
  const now = Date.now();
  const cutoff = now - opts.windowMs;

  let bucket = memoryStore.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    memoryStore.set(key, bucket);
  }
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= opts.limit) {
    const earliest = bucket.hits[0]!;
    const retryMs = Math.max(0, opts.windowMs - (now - earliest));
    const retrySec = Math.ceil(retryMs / 1000);
    const resetEpochSec = Math.ceil((now + retryMs) / 1000);
    return { ok: false, response: denyResponse(opts.limit, retrySec, resetEpochSec) };
  }
  bucket.hits.push(now);
  return { ok: true, remaining: opts.limit - bucket.hits.length };
}

// Best-effort cleanup — runs every 5 min to drop empty buckets so the
// in-memory map doesn't grow unbounded over a long-running process.
// Skipped on the Upstash path since Upstash handles its own TTLs.
if (typeof setInterval !== "undefined") {
  const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    // 1h cutoff — no per-route window we use exceeds that.
    const cutoff = now - 60 * 60 * 1000;
    for (const [key, bucket] of memoryStore.entries()) {
      const last = bucket.hits[bucket.hits.length - 1] ?? 0;
      if (last < cutoff) memoryStore.delete(key);
    }
  }, CLEANUP_INTERVAL_MS).unref?.();
}

// ─── Public entry point ──────────────────────────────────────────────

let warnedFallback = false;

/**
 * Check a rate-limit bucket. Records this call and returns whether it's
 * allowed. Bucket is keyed by `<scope>:<client-id>` so different routes
 * (and different clients on the same route) don't interfere.
 *
 * Always async now — even the in-memory backend returns a Promise so
 * call sites don't have to change behaviour when Upstash gets enabled.
 *
 * If Upstash is configured but the remote call fails (network blip,
 * Upstash outage), we fail OPEN — letting the request through is the
 * right default for a marketplace where blocking every user on a Redis
 * outage would be a worse failure mode than briefly losing rate
 * limiting. A console.error is logged so the operator sees it.
 */
export async function checkRateLimit(
  req: Request,
  scope: string,
  opts: CheckOptions
): Promise<RateLimitOk | RateLimitDenied> {
  if (flags.hasUpstash) {
    try {
      return await checkUpstash(req, scope, opts);
    } catch (err) {
      console.error("[rate-limit] Upstash call failed; failing open:", err);
      return { ok: true, remaining: opts.limit };
    }
  }
  if (env.IS_PROD && !warnedFallback) {
    warnedFallback = true;
    console.warn(
      "[rate-limit] No UPSTASH_REDIS_REST_URL configured — using per-process in-memory limiter. This does NOT scale across Vercel function instances."
    );
  }
  return checkMemory(req, scope, opts);
}
