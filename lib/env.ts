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
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_MODE?: "sandbox" | "live";

  // ─── Optional ─────────────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  ADMIN_EMAIL?: string;
  PLATFORM_COMMISSION_PERCENT?: string;
  DIRECT_URL?: string;
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
const [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET] = readPair(
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "PayPal"
);

// ─── Optional ────────────────────────────────────────────────────────────────
const R2_ACCOUNT_ID = read("R2_ACCOUNT_ID");
const R2_ACCESS_KEY_ID = read("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = read("R2_SECRET_ACCESS_KEY");
const R2_BUCKET_NAME = read("R2_BUCKET_NAME");
const R2_PUBLIC_URL = read("R2_PUBLIC_URL");
const PAYPAL_MODE = (read("PAYPAL_MODE") as "sandbox" | "live") ?? "sandbox";
const ADMIN_EMAIL = read("ADMIN_EMAIL");
const PLATFORM_COMMISSION_PERCENT = read("PLATFORM_COMMISSION_PERCENT");
const DIRECT_URL = read("DIRECT_URL");

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
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_MODE,
  ADMIN_EMAIL,
  PLATFORM_COMMISSION_PERCENT,
  DIRECT_URL,
  IS_PROD: isProd,
} as const;

export const flags = {
  hasGoogleAuth: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
  hasR2: !!(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME
  ),
  hasPayPal: !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET),
  hasAdminBootstrap: !!ADMIN_EMAIL,
} as const;
