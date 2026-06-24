// One-shot script: clean the checkered "transparency indicator" out of the
// AI-generated category hero PNGs, auto-trim each image to its subject so
// every card reads at the same visual scale, then re-upload to R2 under the
// same stable keys the Categories component already points at.
//
// Why this is needed:
//   The AI tool that generated the source PNGs exported them with the
//   editor's checkered transparency pattern baked into actual pixels
//   (not real transparency). At the same time the subjects sit at very
//   different scales inside each canvas — the chat icons fill ~60% of
//   their canvas while the knight fills ~95%. Result on the live site:
//   visible checkerboard around each character and obvious size mismatch
//   between tiles.
//
// What it does:
//   1. Reads each source PNG.
//   2. BFS flood-fill from all four corners: any pixel that's "near
//      grayscale and bright" (i.e. matches the checkered indicator's
//      gray/white tiles) and is connected to a corner gets alpha = 0.
//   3. sharp.trim() crops the now-transparent border down to the subject.
//   4. Resize so the trimmed subject sits on a uniform 1024x1024 canvas
//      with consistent padding — guarantees every card hero reads at the
//      same scale even though the AI source crops were inconsistent.
//   5. Re-upload to R2 under the same key Categories.tsx points at, so
//      no code change is required.
//
// Run:
//   node --env-file=.env scripts/clean-category-heroes.mjs

import path from "node:path";
import sharp from "sharp";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const DOWNLOADS = "C:/Users/TALHA/Downloads/Data_1/Data_1/Homepage images";
const FINAL_CANVAS = 1024; // px — final hero canvas size after normalisation
const SUBJECT_PADDING_PCT = 6; // empty margin around the subject

const UPLOADS = [
  {
    slug: "3d-models",
    source: "Yellow_Green_Red#11.png",
  },
  {
    slug: "3d-icons",
    source: "Untitled-1.png",
  },
  {
    slug: "lottie",
    source: "Robot_Tranparentb.png",
  },
  {
    slug: "svg-icons",
    source: "Layer 50 copy.png",
  },
  {
    slug: "ai-suite",
    source: "AI_Writing_1.png",
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
const publicBase = process.env.R2_PUBLIC_URL.replace(/\/$/, "");

/**
 * Returns true when a pixel matches the checkered transparency-indicator
 * pattern that the AI exporter baked into the source images. That pattern
 * is a tiled grid of light-gray (~204,204,204) and white (~255,255,255)
 * squares — so we accept anything that's near-grayscale AND bright.
 *
 * Saturation threshold (max - min) keeps coloured artwork safe: a panda's
 * white fur is still nearly grayscale, but the panda is connected to
 * coloured pixels (the robe) so flood-fill from a corner can't reach it.
 */
function isCheckerPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max - min;
  // Near-grayscale: small spread between channels.
  if (saturation > 18) return false;
  // Bright: average luminance is in the checker range (gray ~204 or
  // white ~255). Reject anything darker — we'd otherwise key out dark
  // shadows in the artwork.
  const avg = (r + g + b) / 3;
  if (avg < 188) return false;
  return true;
}

/**
 * Flood-fill from all four corners. Marks the alpha channel to 0 for any
 * pixel that is (a) a checker pixel by the predicate above, AND (b)
 * reachable from a corner through other checker pixels. This keeps
 * grayscale pixels INSIDE the subject (e.g. the panda's white fur) opaque
 * because they aren't externally reachable.
 */
function floodKeyBackground(pixels, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = [];

  function tryEnqueue(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const p = idx * 4;
    if (!isCheckerPixel(pixels[p], pixels[p + 1], pixels[p + 2])) return;
    visited[idx] = 1;
    queue.push(idx);
  }

  // Seed from every corner pixel.
  tryEnqueue(0, 0);
  tryEnqueue(width - 1, 0);
  tryEnqueue(0, height - 1);
  tryEnqueue(width - 1, height - 1);

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    pixels[idx * 4 + 3] = 0; // alpha → transparent
    const x = idx % width;
    const y = Math.floor(idx / width);
    tryEnqueue(x + 1, y);
    tryEnqueue(x - 1, y);
    tryEnqueue(x, y + 1);
    tryEnqueue(x, y - 1);
  }
}

async function cleanOne(srcPath) {
  // Step 1: read the source as raw RGBA so we can flood-fill the
  // baked-in checker pattern out of the alpha channel.
  const src = sharp(srcPath).ensureAlpha();
  const { data, info } = await src
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(data);
  floodKeyBackground(pixels, info.width, info.height);

  // Step 2: rebuild a sharp pipeline from the cleaned raw buffer, trim
  // the now-transparent border down to the subject's bounding box, then
  // letterbox onto a uniform square canvas so every card hero reads at
  // the same scale on the home page.
  const cleaned = await sharp(Buffer.from(pixels.buffer), {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  const trimmed = await sharp(cleaned)
    // threshold tells trim "anything below this alpha counts as edge" —
    // 10/255 is generous so semi-transparent fringe pixels from the
    // anti-aliased subject edge still get cropped to a tight bound.
    .trim({ threshold: 10 })
    .toBuffer();

  const padPx = Math.round((FINAL_CANVAS * SUBJECT_PADDING_PCT) / 100);
  const contentSize = FINAL_CANVAS - padPx * 2;

  const normalised = await sharp({
    create: {
      width: FINAL_CANVAS,
      height: FINAL_CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp(trimmed)
          // resize so the subject fills the inner content area while
          // preserving aspect ratio. `fit: "inside"` won't crop, just
          // scales down the longer side to <= contentSize.
          .resize({
            width: contentSize,
            height: contentSize,
            fit: "inside",
            withoutEnlargement: false,
          })
          .toBuffer(),
        gravity: "center",
      },
    ])
    .png()
    .toBuffer();

  return normalised;
}

const results = [];
for (const item of UPLOADS) {
  const srcPath = path.join(DOWNLOADS, item.source);
  const dstKey = `public/categories/${item.slug}.png`;
  console.log(`→ ${item.slug}`);
  console.log(`    src: ${srcPath}`);

  let cleaned;
  try {
    cleaned = await cleanOne(srcPath);
  } catch (err) {
    console.error(`    ✗ cleanup failed: ${err.message}`);
    process.exit(1);
  }
  console.log(`    cleaned: ${(cleaned.length / 1024).toFixed(0)} KB`);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: dstKey,
      Body: cleaned,
      ContentType: "image/png",
      CacheControl: "public, max-age=86400, s-maxage=86400",
    })
  );

  const url = `${publicBase}/${dstKey}`;
  results.push({ slug: item.slug, url });
  console.log(`    ✓ ${url}\n`);
}

console.log("\nDone. All 5 heroes cleaned + normalised + re-uploaded.");
