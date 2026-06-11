// One-shot script: upload the 5 home-page "Browse by format" hero PNGs to R2
// under deterministic keys so the Categories component can reference them by
// stable URL. Re-running the script overwrites the same keys, so we can swap
// the artwork later without touching app code.
//
// Run:
//   node --env-file=.env scripts/upload-category-heroes.mjs
//
// Requires R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY /
// R2_BUCKET_NAME / R2_PUBLIC_URL in .env (production R2 credentials).

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const DOWNLOADS = "C:/Users/TALHA/Downloads";

// Mapping locked in after visually identifying each source PNG.
// Edit the `source` field if you want to swap art — re-running the script
// uploads to the same destination key, so the rest of the app needs no
// changes.
const UPLOADS = [
  {
    slug: "3d-models",
    source: "Gemini_Generated_Image_ln6yo2ln6yo2ln6.png",
    description: "Knight warrior",
  },
  {
    slug: "3d-icons",
    source: "Gemini_Generated_Image_f8oicrf8oicrf8oi.png",
    description: "3D girl avatar",
  },
  {
    slug: "lottie",
    source: "Gemini_Generated_Image_dea7fcdea7fcdea7.png",
    description: "Animator with tablet",
  },
  {
    slug: "svg-icons",
    source: "Gemini_Generated_Image_fvuskofvuskofvus (1).png",
    description: "Chat icons + robot",
  },
  {
    slug: "ai-suite",
    source: "Gemini_Generated_Image_ash53mash53mash5.png",
    description: "Imperial panda mascot",
  },
];

const required = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
];
for (const key of required) {
  if (!process.env[key]) {
    console.error(
      `[upload-category-heroes] Missing env: ${key}. Run with --env-file=.env`
    );
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
const publicBase = process.env.R2_PUBLIC_URL.replace(/\/$/, "");

const results = [];

for (const item of UPLOADS) {
  const srcPath = path.join(DOWNLOADS, item.source);
  const dstKey = `public/categories/${item.slug}.png`;
  console.log(`→ ${item.slug.padEnd(10)}  ${item.description}`);
  console.log(`    src: ${srcPath}`);
  console.log(`    key: ${dstKey}`);

  let body;
  try {
    body = await readFile(srcPath);
  } catch (err) {
    console.error(`    ✗ cannot read source: ${err.message}`);
    process.exit(1);
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: dstKey,
      Body: body,
      ContentType: "image/png",
      // Long-cache so the CDN can hold these for a day; deterministic keys
      // mean any swap involves re-uploading the same key, which busts cache
      // via origin update naturally.
      CacheControl: "public, max-age=86400, s-maxage=86400",
    })
  );

  const url = `${publicBase}/${dstKey}`;
  results.push({ slug: item.slug, url });
  console.log(`    ✓ ${url}\n`);
}

console.log("\nDone. Drop these into Categories.tsx:");
for (const r of results) {
  console.log(`  ${r.slug.padEnd(10)} → ${r.url}`);
}
