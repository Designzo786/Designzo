// Alternative CORS-setup script that uses the Cloudflare REST API
// (Bearer-token auth) instead of the S3-compatible PutBucketCors call.
//
// Why this exists:
//   The R2 *object* API tokens you typically issue for the marketplace
//   server (the R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY pair) only have
//   read/write permission on objects. Bucket-level config — including
//   CORS — requires an *Account* token issued from
//   dash.cloudflare.com → Manage Account → API Tokens with the
//   `Workers R2 Storage: Edit` permission.
//
//   scripts/setup-r2-cors.mjs uses the S3 client + the R2 object token
//   and gets `AccessDenied` whenever the object token lacks bucket
//   permissions. This script reaches the same outcome through the
//   Cloudflare REST API instead, using a token you can scope precisely.
//
// Required env (add to .env):
//   CLOUDFLARE_ACCOUNT_ID  — same as R2_ACCOUNT_ID
//   CLOUDFLARE_API_TOKEN   — Account token with "Workers R2 Storage: Edit"
//   R2_BUCKET_NAME         — the bucket
//   NEXTAUTH_URL           — the production origin (used in AllowedOrigins)
//
// Run once after creating the token, then re-run any time the origin
// list changes (custom domain swap, new preview environment, etc.).
// Idempotent — the PUT replaces the existing rule set.

const required = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "R2_BUCKET_NAME",
];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing env: ${key}. Run with --env-file=.env`);
    process.exit(1);
  }
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const bucket = process.env.R2_BUCKET_NAME;

// Origins the browser is allowed to PUT from. localhost covers dev,
// NEXTAUTH_URL covers production, *.vercel.app catches every preview
// deploy without the operator needing to update CORS for each one.
const origins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://*.vercel.app",
]);
if (process.env.NEXTAUTH_URL) {
  origins.add(process.env.NEXTAUTH_URL.replace(/\/$/, ""));
}

const rules = [
  {
    allowed: {
      origins: Array.from(origins),
      methods: ["GET", "HEAD", "PUT"],
      headers: ["*"],
    },
    exposeHeaders: ["ETag", "Content-Length", "Content-Type"],
    maxAgeSeconds: 3600,
  },
];

const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/cors`;

const res = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ rules }),
});

const body = await res.json().catch(() => ({}));

if (!res.ok || body?.success === false) {
  console.error(`✗ Cloudflare API rejected the request (HTTP ${res.status}).`);
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log(`✓ CORS rules installed on bucket "${bucket}"`);
console.log("  Allowed origins:");
for (const o of origins) console.log("   -", o);

// Read back so the operator can eyeball the configuration that's now live.
const verify = await fetch(url, {
  headers: { Authorization: `Bearer ${apiToken}` },
});
const verifyBody = await verify.json().catch(() => ({}));
console.log("\nLive CORS configuration:");
console.log(JSON.stringify(verifyBody?.result ?? verifyBody, null, 2));
