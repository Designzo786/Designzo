// One-shot script: configure CORS on the R2 bucket so the browser can PUT
// directly to pre-signed URLs from /api/assets/upload-url.
//
// Without this, every direct-to-R2 upload from the marketplace fails in
// the browser with a CORS preflight error (the bucket rejects the OPTIONS
// request, so Chrome / Safari never even fires the PUT). This script
// installs an allow-list scoped to the configured app domains.
//
// Run once after setting R2 credentials:
//   node --env-file=.env scripts/setup-r2-cors.mjs
//
// Re-run whenever NEXTAUTH_URL changes (production cutover, custom
// domain swap, etc.). PutBucketCors is idempotent — repeating it with
// the same rules is a no-op.

import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from "@aws-sdk/client-s3";

const required = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing env: ${key}. Run with --env-file=.env`);
    process.exit(1);
  }
}

// Origins to allow. localhost covers dev; NEXTAUTH_URL covers the
// production deployment. Add any preview / staging domain here as new
// strings — the bucket policy supports a list.
const origins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);
if (process.env.NEXTAUTH_URL) {
  origins.add(process.env.NEXTAUTH_URL.replace(/\/$/, ""));
}
// Vercel preview / production guesses based on the deployment domain.
if (process.env.VERCEL_URL) {
  origins.add(`https://${process.env.VERCEL_URL.replace(/\/$/, "")}`);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const corsConfig = {
  Bucket: process.env.R2_BUCKET_NAME,
  CORSConfiguration: {
    CORSRules: [
      {
        // Direct uploads from the marketplace browser.
        AllowedOrigins: Array.from(origins),
        // PUT for uploads, GET/HEAD for asset detail page renderable
        // assets (.glb / .json / .svg are loaded by the viewer).
        AllowedMethods: ["GET", "HEAD", "PUT"],
        // Content-Type is required (signed URLs enforce it), and we want
        // to read upload progress + the ETag echo from R2 in the browser
        // for upload telemetry.
        AllowedHeaders: ["*"],
        ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
        MaxAgeSeconds: 3600,
      },
    ],
  },
};

await client.send(new PutBucketCorsCommand(corsConfig));
console.log("✓ CORS rules installed on bucket:", process.env.R2_BUCKET_NAME);
console.log("  Allowed origins:");
for (const o of corsConfig.CORSConfiguration.CORSRules[0].AllowedOrigins) {
  console.log("   -", o);
}

// Read back so the operator can eyeball what's now in effect.
const verify = await client.send(
  new GetBucketCorsCommand({ Bucket: process.env.R2_BUCKET_NAME })
);
console.log("\nLive CORS configuration:");
console.log(JSON.stringify(verify.CORSRules, null, 2));
