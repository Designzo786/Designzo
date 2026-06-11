// Delete the 5 category hero PNGs from R2.
//
// Use when swapping the artwork: clear the existing keys so a stale
// CDN cache can't serve the old image after a re-upload of new art.
// Safe to re-run — DeleteObject is idempotent in S3-compatible APIs.
//
// Run:
//   node --env-file=.env scripts/delete-category-heroes.mjs

import {
  S3Client,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const SLUGS = ["3d-models", "3d-icons", "lottie", "svg-icons", "ai-suite"];

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

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const bucket = process.env.R2_BUCKET_NAME;

for (const slug of SLUGS) {
  const key = `public/categories/${slug}.png`;
  await client.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key })
  );
  console.log(`✓ deleted ${key}`);
}

console.log("\nAll 5 category hero PNGs cleared from R2.");
