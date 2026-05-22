/**
 * Cloudflare R2 storage backend.
 *
 * R2 is S3-compatible, so we drive it with the AWS S3 SDK pointed at the
 * R2 endpoint. This module holds the low-level put/get/delete; `lib/storage.ts`
 * decides whether to use R2 (production) or local disk (dev) based on
 * `flags.hasR2`.
 *
 * Required env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *               R2_BUCKET_NAME, and R2_PUBLIC_URL (public bucket / CDN base
 *               used to build browser-facing URLs for previews & avatars).
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

let _client: S3Client | null = null;

// Lazy — never construct the client (or read its env) until something
// actually stores/reads a file, so importing this module is safe in dev.
function client(): S3Client {
  if (_client) return _client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 is not configured.");
  }
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

function bucket(): string {
  const name = process.env.R2_BUCKET_NAME;
  if (!name) throw new Error("R2_BUCKET_NAME is not set.");
  return name;
}

export async function r2Put(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function r2Get(key: string): Promise<Buffer> {
  const res = await client().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key })
  );
  if (!res.Body) throw new Error(`R2 object has no body: ${key}`);
  const bytes = await res.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function r2Delete(key: string): Promise<void> {
  await client().send(
    new DeleteObjectCommand({ Bucket: bucket(), Key: key })
  );
}

/** Browser-facing URL for an object (used for public previews / avatars). */
export function r2PublicUrl(key: string): string {
  const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  return `${base}/${key}`;
}

/**
 * Extracts the object key from a stored public URL. Returns null when the
 * URL isn't one of ours (e.g. a Google OAuth avatar) so `deletePublic` can
 * safely ignore it.
 */
export function r2KeyFromUrl(url: string): string | null {
  const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  if (base && url.startsWith(base + "/")) {
    return url.slice(base.length + 1);
  }
  return null;
}
