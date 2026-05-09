import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "./prisma";
import { MOCK_ASSETS } from "./mock/assets";

const SAMPLES_EMAIL = "samples@gamechanger.local";
const PLACEHOLDER_REL = "placeholders/sample.txt";
const PLACEHOLDER_BODY = `GameChanger sample asset
=========================

This is a placeholder file shipped with the seeded marketplace samples.

Each sample asset on the marketplace shares this same placeholder so you can
test the full purchase + download flow end-to-end. Real assets uploaded by
creators get their own files and previews.

To replace this with a real asset of your own, sign in and visit
/dashboard/uploads/new.
`;

// Cache the seed result for the lifetime of this Node process so we don't
// re-check on every request. Reset to null on failure to allow a retry.
let seedPromise: Promise<void> | null = null;

/**
 * Ensures the marketplace's sample assets exist as real DB rows. Idempotent
 * and self-healing: runs once per process, no-op after that. Pages can call
 * this before they load assets so missing seed data is auto-created.
 *
 * Disabled in production — running auto-seed against a real DB would inject
 * fake assets into a live marketplace. To bootstrap a real env, run
 * `npx prisma db seed` from a controlled environment instead.
 */
export function ensureSampleAssetsSeeded(): Promise<void> {
  if (process.env.NODE_ENV === "production") return Promise.resolve();
  if (!seedPromise) {
    seedPromise = doSeed().catch((err) => {
      console.error("[auto-seed] failed:", err);
      seedPromise = null; // retry on next call
      throw err;
    });
  }
  return seedPromise;
}

async function doSeed() {
  // 1. Find or create the system "Sample Creators" user that owns the samples.
  const samplesUser = await prisma.user.upsert({
    where: { email: SAMPLES_EMAIL },
    create: {
      name: "Sample Creators",
      email: SAMPLES_EMAIL,
      role: "CREATOR",
      // No passwordHash — nobody should sign in as this account.
    },
    update: {},
    select: { id: true },
  });

  // 2. Skip the rest if every mock asset is already in the DB.
  const existingCount = await prisma.asset.count({
    where: { id: { in: MOCK_ASSETS.map((m) => m.id) } },
  });
  if (existingCount >= MOCK_ASSETS.length) return;

  // 3. Write the shared placeholder file. Failure is non-fatal: in serverless
  //    environments the filesystem is read-only; downloads would fail at
  //    read-time but we don't want to crash the page render.
  try {
    const placeholderDir = path.join(
      process.cwd(),
      "private-uploads",
      "placeholders"
    );
    await fs.mkdir(placeholderDir, { recursive: true });
    await fs.writeFile(
      path.join(placeholderDir, "sample.txt"),
      PLACEHOLDER_BODY,
      "utf8"
    );
  } catch (err) {
    console.warn("[auto-seed] placeholder file write failed:", err);
  }

  // 4. Upsert each missing mock asset as an APPROVED, downloadable Asset row.
  for (const m of MOCK_ASSETS) {
    await prisma.asset.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        title: m.title,
        description: m.description,
        category: m.category,
        tags: m.tags,
        fileType: m.fileType,
        price: m.price,
        previewKey: "", // empty — UI falls back to 3D AssetViewer for samples
        fileKey: PLACEHOLDER_REL,
        fileSizeBytes: m.fileSize,
        downloads: m.downloads,
        status: "APPROVED",
        uploaderId: samplesUser.id,
      },
      update: {
        // Keep titles/desc/price refreshed if mock data drifts, but DON'T
        // clobber the downloads counter or status.
        title: m.title,
        description: m.description,
        category: m.category,
        tags: m.tags,
        price: m.price,
      },
    });
  }
}
