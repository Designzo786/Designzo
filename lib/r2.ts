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
  HeadObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

/**
 * Issue a pre-signed PUT URL the browser can use to upload directly to R2,
 * bypassing the serverless function's body-size limit (Vercel: 4.5 MB on
 * Hobby / Pro). The signature locks in the bucket, key, and HTTP method,
 * and the URL expires after `expiresInSeconds` so a leaked URL has a tight
 * blast radius.
 *
 * Optional headers (contentType, contentLengthRange) become required at
 * upload time — R2 rejects the PUT if the browser's request headers don't
 * match. We use contentType to lock the MIME type so a user can't upload
 * a .glb under a key we issued for a .png.
 */
export async function r2SignedPutUrl(
  key: string,
  opts: { contentType?: string; expiresInSeconds?: number } = {}
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: opts.contentType,
  });
  return getSignedUrl(client(), cmd, {
    expiresIn: opts.expiresInSeconds ?? 300, // 5 min default
  });
}

/**
 * HEAD an object. Returns size + contentType when it exists, null otherwise.
 * Used after a signed-URL upload to confirm the browser actually completed
 * the PUT before we commit metadata to the DB.
 */
export async function r2Head(
  key: string
): Promise<{ contentLength: number; contentType?: string } | null> {
  try {
    const res = await client().send(
      new HeadObjectCommand({ Bucket: bucket(), Key: key })
    );
    return {
      contentLength: res.ContentLength ?? 0,
      contentType: res.ContentType,
    };
  } catch (err) {
    // 404 / NotFound surfaces as a thrown error in the AWS SDK — treat all
    // errors as "not present" for the caller's purpose.
    if (
      err &&
      typeof err === "object" &&
      "name" in err &&
      (err.name === "NotFound" || err.name === "NoSuchKey")
    ) {
      return null;
    }
    throw err;
  }
}

/**
 * Read a byte range from an object as a Buffer. Used for content validation
 * — the server pulls only the first 64 KB or so to run magic-byte checks
 * without paying full-file egress on every upload.
 */
export async function r2GetRange(
  key: string,
  start: number,
  endInclusive: number
): Promise<Buffer> {
  const res = await client().send(
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      Range: `bytes=${start}-${endInclusive}`,
    })
  );
  if (!res.Body) throw new Error(`R2 object has no body: ${key}`);
  const bytes = await res.Body.transformToByteArray();
  return Buffer.from(bytes);
}

/**
 * Server-side copy from one R2 key to another. Used to publish a browser-
 * renderable asset (.glb / .json / .svg) into the public path so the
 * detail-page viewer can fetch it, without re-uploading from the browser.
 * R2 performs the copy internally — no transfer, no extra egress.
 */
export async function r2Copy(srcKey: string, dstKey: string): Promise<void> {
  await client().send(
    new CopyObjectCommand({
      Bucket: bucket(),
      Key: dstKey,
      CopySource: `/${bucket()}/${encodeURIComponent(srcKey).replace(/%2F/g, "/")}`,
    })
  );
}
