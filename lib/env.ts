/**
 * Type-safe environment variable access.
 *
 * In development, missing optional vars are tolerated and warned about.
 * In production, missing REQUIRED vars throw at startup so the app never
 * boots into a half-broken state (e.g. missing NEXTAUTH_SECRET = silent
 * security hole).
 *
 * Usage: `import { env } from "@/lib/env"` then `env.NEXTAUTH_SECRET`.
 * Avoids sprinkling `process.env.X!` non-null assertions across the codebase.
 */

const isProd = process.env.NODE_ENV === "production";

interface EnvShape {
  // ─── Always required ──────────────────────────────────────────────────────
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;
  DATABASE_URL: string;

  // ─── Required only in production ──────────────────────────────────────────
  // Filesystem-based storage breaks on Vercel; production deployments must
  // set these to use R2 instead.
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_URL?: string;

  // Real payments need these. Without them the checkout falls back to mock-pay,
  // which is hard-disabled in production by /api/payments/checkout.
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;

  // Secret for verifying inbound Razorpay webhooks. Set this to the same
  // value configured in the Razorpay dashboard's webhook settings.
  RAZORPAY_WEBHOOK_SECRET?: string;

  // RazorpayX is a SEPARATE product (and separate API key) used only for
  // creator payouts. Without these, admin payouts work in manual mode —
  // admin sends money via bank transfer and marks the row PAID by hand.
  RAZORPAY_X_KEY_ID?: string;
  RAZORPAY_X_KEY_SECRET?: string;
  RAZORPAY_X_ACCOUNT_NUMBER?: string;

  // ─── Optional ─────────────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  ADMIN_EMAIL?: string;
  PLATFORM_COMMISSION_PERCENT?: string;
  DIRECT_URL?: string;

  // Upstash Redis (HTTPS REST API) — multi-instance distributed rate
  // limiter. Without these, lib/rate-limit.ts falls back to per-process
  // in-memory counters (fine for dev, leaky on Vercel where each region
  // / instance has its own map). Production-grade setup uses Upstash:
  //   1. Create a database at console.upstash.com
  //   2. Copy "REST URL" → UPSTASH_REDIS_REST_URL
  //   3. Copy "REST Token" → UPSTASH_REDIS_REST_TOKEN
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

function read(name: keyof EnvShape, opts: { required?: boolean } = {}) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    if (opts.required) {
      const msg = `Missing required environment variable: ${name}`;
      if (isProd) {
        // Hard fail — never start a prod server with broken auth or DB
        throw new Error(msg);
      }
      // Dev: warn but keep booting
      console.warn(`[env] ${msg} (dev: continuing anyway)`);
    }
    return undefined;
  }
  return value.trim();
}

function readPair(
  a: keyof EnvShape,
  b: keyof EnvShape,
  context: string
): [string | undefined, string | undefined] {
  const av = read(a);
  const bv = read(b);
  // If one is set but not the other, that's almost always a config bug.
  if ((!!av) !== (!!bv)) {
    const msg = `${context}: both ${a} and ${b} must be set together (or neither). Got ${a}=${av ? "set" : "unset"}, ${b}=${bv ? "set" : "unset"}.`;
    if (isProd) throw new Error(msg);
    console.warn(`[env] ${msg}`);
  }
  return [av, bv];
}

// ─── Required ─────────────────────────────────────────────────────────────────
const NEXTAUTH_URL = read("NEXTAUTH_URL", { required: true })!;
const NEXTAUTH_SECRET = read("NEXTAUTH_SECRET", { required: true })!;
const DATABASE_URL = read("DATABASE_URL", { required: true })!;

// ─── Paired (must be all-or-none) ────────────────────────────────────────────
const [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET] = readPair(
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "Google OAuth"
);
const [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] = readPair(
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "Razorpay"
);
const [RAZORPAY_X_KEY_ID, RAZORPAY_X_KEY_SECRET] = readPair(
  "RAZORPAY_X_KEY_ID",
  "RAZORPAY_X_KEY_SECRET",
  "RazorpayX"
);
const RAZORPAY_X_ACCOUNT_NUMBER = read("RAZORPAY_X_ACCOUNT_NUMBER");
const RAZORPAY_WEBHOOK_SECRET = read("RAZORPAY_WEBHOOK_SECRET");

// ─── Optional ────────────────────────────────────────────────────────────────
const R2_ACCOUNT_ID = read("R2_ACCOUNT_ID");
const R2_ACCESS_KEY_ID = read("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = read("R2_SECRET_ACCESS_KEY");
const R2_BUCKET_NAME = read("R2_BUCKET_NAME");
const R2_PUBLIC_URL = read("R2_PUBLIC_URL");
const ADMIN_EMAIL = read("ADMIN_EMAIL");
const PLATFORM_COMMISSION_PERCENT = read("PLATFORM_COMMISSION_PERCENT");
const DIRECT_URL = read("DIRECT_URL");
const UPSTASH_REDIS_REST_URL = read("UPSTASH_REDIS_REST_URL");
const UPSTASH_REDIS_REST_TOKEN = read("UPSTASH_REDIS_REST_TOKEN");

export const env = {
  NEXTAUTH_URL,
  NEXTAUTH_SECRET,
  DATABASE_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
  RAZORPAY_X_KEY_ID,
  RAZORPAY_X_KEY_SECRET,
  RAZORPAY_X_ACCOUNT_NUMBER,
  ADMIN_EMAIL,
  PLATFORM_COMMISSION_PERCENT,
  DIRECT_URL,
  UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN,
  IS_PROD: isProd,
} as const;

/**
 * Returns the site's public base URL — used for email links, sitemap, robots.
 * Resolution order:
 *   1. NEXTAUTH_URL  (explicit; works everywhere)
 *   2. VERCEL_URL    (auto-set by Vercel as "host.vercel.app" with no scheme)
 *   3. localhost     (dev fallback)
 *
 * Strips a trailing slash so callers can confidently append paths.
 */
export function getPublicBaseUrl(): string {
  const raw =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export const flags = {
  hasGoogleAuth: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
  hasR2: !!(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME
  ),
  hasRazorpay: !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET),
  hasRazorpayWebhook: !!RAZORPAY_WEBHOOK_SECRET,
  hasRazorpayX: !!(
    RAZORPAY_X_KEY_ID &&
    RAZORPAY_X_KEY_SECRET &&
    RAZORPAY_X_ACCOUNT_NUMBER
  ),
  hasAdminBootstrap: !!ADMIN_EMAIL,
  hasUpstash: !!(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN),
} as const;
