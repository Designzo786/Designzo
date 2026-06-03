import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { flags } from "./env";
import { r2Put, r2Get, r2Delete, r2PublicUrl, r2KeyFromUrl } from "./r2";

/**
 * File storage with two backends, chosen automatically:
 *
 *   • Cloudflare R2 — used when R2 env vars are set (`flags.hasR2`).
 *     This is the production backend: durable, survives deploys.
 *
 *   • Local disk — the dev fallback when R2 isn't configured.
 *     NOT safe for serverless production (filesystem is ephemeral) — it
 *     exists so the app runs end-to-end locally without an R2 account.
 *
 * Every export keeps the same signature regardless of backend, so callers
 * (upload routes, avatar route, download route) never need to know which
 * one is active.
 *
 * Layout:
 *   public  — previews, avatars, model files. Browser-readable.
 *             local: public/uploads/<subdir>/...   R2: public/<subdir>/...
 *   private — the actual sellable asset file. Served only via the gated
 *             /api/assets/[id]/download route.
 *             local: private-uploads/<subdir>/...  R2: private/<subdir>/...
 */

const PUBLIC_DIR = path.join(process.cwd(), "public", "uploads");
const PRIVATE_DIR = path.join(process.cwd(), "private-uploads");

function safeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, "_");
  return base.slice(0, 120) || "file";
}

function nonce(): string {
  return crypto.randomBytes(8).toString("hex");
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

// Content type for public files so the browser renders previews/avatars
// correctly when fetched straight from R2.
function contentTypeFor(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "glb":
      return "model/gltf-binary";
    case "gltf":
      return "model/gltf+json";
    case "json":
      return "application/json";
    case "lottie":
      // .lottie is a ZIP container — application/zip is the closest standard
      // MIME. LottieFiles' tooling reads them regardless of the Content-Type
      // header, but setting this stops browsers from sniffing it as text.
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}

export interface SavedPublic {
  url: string; // browser-accessible URL
  key: string; // storage key (R2) or the URL (local)
  bytes: number;
}

export interface SavedPrivate {
  key: string; // opaque key, resolved by readPrivate
  bytes: number;
}

/**
 * Save a publicly-readable file (preview thumbnail, avatar, model).
 * Returns a URL usable directly in <img src> / the 3D viewer.
 */
export async function savePublic(
  subdir: string,
  filename: string,
  buffer: Buffer
): Promise<SavedPublic> {
  const safe = `${nonce()}-${safeFilename(filename)}`;
  const bytes = buffer.length;

  if (flags.hasR2) {
    const key = `public/${subdir}/${safe}`;
    await r2Put(key, buffer, contentTypeFor(filename));
    return { url: r2PublicUrl(key), key, bytes };
  }

  const dir = path.join(PUBLIC_DIR, subdir);
  await ensureDir(dir);
  await fs.writeFile(path.join(dir, safe), buffer);
  const url = `/uploads/${subdir}/${safe}`;
  return { url, key: url, bytes };
}

/**
 * Save a protected file (the actual sellable asset). Never browser-readable
 * directly — only reachable through the gated download route via readPrivate.
 */
export async function savePrivate(
  subdir: string,
  filename: string,
  buffer: Buffer
): Promise<SavedPrivate> {
  const safe = `${nonce()}-${safeFilename(filename)}`;
  const bytes = buffer.length;

  if (flags.hasR2) {
    const key = `private/${subdir}/${safe}`;
    await r2Put(key, buffer, "application/octet-stream");
    return { key, bytes };
  }

  const dir = path.join(PRIVATE_DIR, subdir);
  await ensureDir(dir);
  await fs.writeFile(path.join(dir, safe), buffer);
  return { key: `${subdir}/${safe}`, bytes };
}

/**
 * Resolve a local private key to an absolute path. Refuses any key that
 * escapes the private dir (path-traversal protection). Local backend only.
 */
export function resolvePrivatePath(key: string): string {
  const resolved = path.join(PRIVATE_DIR, key);
  if (!resolved.startsWith(PRIVATE_DIR + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return resolved;
}

/**
 * Read a private file as a buffer. The caller MUST do auth checks before
 * calling — there is no permission check here.
 */
export async function readPrivate(key: string): Promise<Buffer> {
  if (flags.hasR2) {
    return r2Get(key);
  }
  return fs.readFile(resolvePrivatePath(key));
}

/**
 * Best-effort delete of a public file. Accepts the stored URL. Silently
 * ignores anything it doesn't own (e.g. Google OAuth avatar URLs).
 */
export async function deletePublic(url: string): Promise<void> {
  if (flags.hasR2) {
    const key = r2KeyFromUrl(url);
    if (key) await r2Delete(key).catch(() => {});
    return;
  }
  if (!url.startsWith("/uploads/")) return;
  const rel = url.slice("/uploads/".length);
  const fullPath = path.join(PUBLIC_DIR, rel);
  if (!fullPath.startsWith(PUBLIC_DIR + path.sep)) return;
  await fs.unlink(fullPath).catch(() => {});
}

/** Best-effort delete of a private file. */
export async function deletePrivate(key: string): Promise<void> {
  if (flags.hasR2) {
    await r2Delete(key).catch(() => {});
    return;
  }
  try {
    await fs.unlink(resolvePrivatePath(key)).catch(() => {});
  } catch {
    // Invalid key — silently ignore
  }
}
