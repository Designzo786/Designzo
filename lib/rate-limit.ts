/**
 * In-memory rate limiter (sliding window).
 *
 * Good enough for a single-instance dev or low-traffic deployment. For
 * multi-instance production (e.g. multiple Vercel regions) swap this for
 * Upstash Redis with @upstash/ratelimit — same call signature, just a
 * different `check` implementation.
 *
 * Usage in an API route:
 *
 *   const rl = await checkRateLimit(req, "register", { limit: 5, windowMs: 60_000 });
 *   if (!rl.ok) return rl.response;
 *
 * The route gets back either `{ ok: true }` or `{ ok: false, response }` with
 * a pre-built 429 response, including `Retry-After` and standard headers.
 */

import { NextResponse } from "next/server";

interface Bucket {
  hits: number[];
}

// Map<bucketKey, Bucket>
const store = new Map<string, Bucket>();

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

/**
 * Check a rate limit bucket. Records this call and returns whether it's
 * allowed. Bucket is keyed by `<scope>:<client-id>` so different endpoints
 * don't interfere with each other.
 */
export function checkRateLimit(
  req: Request,
  scope: string,
  opts: CheckOptions
): RateLimitOk | RateLimitDenied {
  const clientId = getClientId(req);
  const key = `${scope}:${clientId}`;
  const now = Date.now();
  const cutoff = now - opts.windowMs;

  let bucket = store.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    store.set(key, bucket);
  }

  // Drop hits outside the window
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= opts.limit) {
    const earliest = bucket.hits[0]!;
    const retryMs = Math.max(0, opts.windowMs - (now - earliest));
    const retrySec = Math.ceil(retryMs / 1000);

    const response = NextResponse.json(
      {
        error: "Too many requests. Please slow down and try again shortly.",
      },
      { status: 429 }
    );
    response.headers.set("Retry-After", String(retrySec));
    response.headers.set("X-RateLimit-Limit", String(opts.limit));
    response.headers.set("X-RateLimit-Remaining", "0");
    response.headers.set("X-RateLimit-Reset", String(Math.ceil((now + retryMs) / 1000)));

    return { ok: false, response };
  }

  bucket.hits.push(now);
  return { ok: true, remaining: opts.limit - bucket.hits.length };
}

// Best-effort cleanup — runs every 5 min to drop empty buckets so the map
// doesn't grow unbounded over a long-running process.
if (typeof setInterval !== "undefined") {
  const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    // Use a generous 1h cutoff — any bucket whose latest hit was > 1h ago is
    // safe to drop, since no per-route window we use exceeds that.
    const cutoff = now - 60 * 60 * 1000;
    for (const [key, bucket] of store.entries()) {
      const last = bucket.hits[bucket.hits.length - 1] ?? 0;
      if (last < cutoff) store.delete(key);
    }
  }, CLEANUP_INTERVAL_MS).unref?.();
}
