import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Local-disk storage backend for development.
 *
 * In production, swap these helpers for Cloudflare R2 (signed PUT URLs for
 * uploads, signed GET URLs for protected downloads). The `key` returned by
 * `savePrivate` and the URL returned by `savePublic` should remain the
 * shape of identifiers used elsewhere in the app — that way only this file
 * needs to change when migrating to R2.
 *
 * Layout:
 *   public/uploads/previews/<nonce>-<file>   ← directly served by Next, used for thumbnails
 *   private-uploads/files/<nonce>-<file>     ← outside public/, accessed only via /api/assets/[id]/download
 */

const PUBLIC_DIR = path.join(process.cwd(), "public", "uploads");
const PRIVATE_DIR = path.join(process.cwd(), "private-uploads");

function safeFilename(name: string): string {
  // Strip any path components and dodgy characters
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, "_");
  // Cap length so we don't blow ext4/NTFS limits
  return base.slice(0, 120) || "file";
}

function nonce(): string {
  return crypto.randomBytes(8).toString("hex");
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export interface SavedPublic {
  url: string; // browser-accessible URL like /uploads/previews/abc-foo.png
  key: string; // same as url (for symmetry with private)
  bytes: number;
}

export interface SavedPrivate {
  key: string; // opaque key like files/abc-bar.glb (no leading slash)
  bytes: number;
}

/**
 * Save a publicly accessible file (e.g. preview thumbnail) under public/uploads/<subdir>/.
 * The returned URL can be used directly in <img src>.
 */
export async function savePublic(
  subdir: string,
  filename: string,
  buffer: Buffer
): Promise<SavedPublic> {
  const dir = path.join(PUBLIC_DIR, subdir);
  await ensureDir(dir);
  const safe = `${nonce()}-${safeFilename(filename)}`;
  const fullPath = path.join(dir, safe);
  await fs.writeFile(fullPath, buffer);
  const url = `/uploads/${subdir}/${safe}`;
  return { url, key: url, bytes: buffer.length };
}

/**
 * Save a protected file (the actual sellable asset). Stored outside public/
 * so it cannot be served by Next directly. Use `streamPrivate` to read it.
 */
export async function savePrivate(
  subdir: string,
  filename: string,
  buffer: Buffer
): Promise<SavedPrivate> {
  const dir = path.join(PRIVATE_DIR, subdir);
  await ensureDir(dir);
  const safe = `${nonce()}-${safeFilename(filename)}`;
  const fullPath = path.join(dir, safe);
  await fs.writeFile(fullPath, buffer);
  return { key: `${subdir}/${safe}`, bytes: buffer.length };
}

/**
 * Resolve a private key to an absolute path. Refuses any key that escapes
 * the private dir (path-traversal protection).
 */
export function resolvePrivatePath(key: string): string {
  const resolved = path.join(PRIVATE_DIR, key);
  if (!resolved.startsWith(PRIVATE_DIR + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return resolved;
}

/**
 * Read a private file as a buffer. The caller is responsible for auth checks
 * BEFORE calling this — there is no permission check here.
 */
export async function readPrivate(key: string): Promise<Buffer> {
  const fullPath = resolvePrivatePath(key);
  return await fs.readFile(fullPath);
}

/**
 * Best-effort delete (won't throw if file is already gone). Used when a
 * record is deleted or rolled back during upload.
 */
export async function deletePublic(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return;
  const rel = url.slice("/uploads/".length);
  const fullPath = path.join(PUBLIC_DIR, rel);
  if (!fullPath.startsWith(PUBLIC_DIR + path.sep)) return;
  await fs.unlink(fullPath).catch(() => {});
}

export async function deletePrivate(key: string): Promise<void> {
  try {
    const fullPath = resolvePrivatePath(key);
    await fs.unlink(fullPath).catch(() => {});
  } catch {
    // Invalid key — silently ignore
  }
}
