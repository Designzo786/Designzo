import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ─── Client singleton ─────────────────────────────────────────────────────────

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME!;

// ─── Key generation ───────────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  assets: ["glb", "gltf", "fbx", "obj", "zip", "blend", "png", "jpg", "jpeg", "hdr", "exr"],
  previews: ["png", "jpg", "jpeg", "webp"],
  models: ["glb", "gltf"],
  avatars: ["png", "jpg", "jpeg", "webp"],
  kyc: ["png", "jpg", "jpeg", "pdf"],
};

export function generateR2Key(
  folder: keyof typeof ALLOWED_EXTENSIONS,
  originalFilename: string,
  uploaderId: string
): string {
  const ext = originalFilename.split(".").pop()?.toLowerCase() ?? "bin";
  if (!ALLOWED_EXTENSIONS[folder].includes(ext)) {
    throw new Error(`File type .${ext} not allowed in ${folder}`);
  }
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `${folder}/${uploaderId}/${timestamp}-${random}.${ext}`;
}

// ─── Signed URLs ──────────────────────────────────────────────────────────────

/** Signed URL for uploading a file directly from the browser to R2 (5 min) */
export async function getUploadSignedUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2, command, { expiresIn: 300 });
}

/** Signed URL for downloading an asset file (15 min) */
export async function getDownloadSignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  return getSignedUrl(r2, command, { expiresIn: 900 });
}

/** Signed URL for reading a preview image in the browser (1 hour) */
export async function getPreviewSignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  return getSignedUrl(r2, command, { expiresIn: 3600 });
}

/**
 * Public CDN URL for preview images (only works if R2_PUBLIC_URL is configured).
 * Use this instead of signed URLs for publicly accessible previews.
 */
export function getPublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) {
    throw new Error("R2_PUBLIC_URL is not configured");
  }
  return `${base.replace(/\/$/, "")}/${key}`;
}

/** Permanent deletion — only call when an asset record is also being deleted */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  await r2.send(command);
}

export { r2 };
