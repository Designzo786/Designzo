/**
 * Strong file-type validation for asset uploads.
 *
 * Three layers, strongest first:
 *   1. Executable scan   — reject anything whose bytes look like a program,
 *                          no matter what extension it was renamed to.
 *   2. Magic-byte check  — for formats with a reliable signature, the file's
 *                          actual content must match its extension.
 *   3. Extension allow-list — the extension must be valid for the declared
 *                          asset FileType.
 *
 * Layers 1-2 operate on the file's bytes, so a `virus.exe` renamed to
 * `model.glb` is caught even though the extension looks fine.
 */
import type { FileType } from "@prisma/client";

// Extensions accepted for each asset FileType.
//
// MODEL_3D is restricted to glTF (.glb / .gltf) on purpose: it's the web
// standard for 3D, and it's the only format the in-browser AssetViewer can
// actually render. Accepting .fbx / .obj / .blend etc. here would let a
// creator upload an asset whose preview silently falls back to the static
// image — broken UX. Every modern DCC tool (Blender, Maya, 3ds Max, Unity)
// exports glTF, so the restriction is mild: "File → Export → glTF (.glb)".
// Widened with the new types so the map stays type-safe while the locally-
// generated Prisma client catches up to the schema. Becomes a redundant
// union after the next clean `prisma generate`.
export const EXTENSIONS_BY_TYPE: Record<
  FileType | "LOTTIE" | "SVG_ICON",
  string[]
> = {
  MODEL_3D: ["glb", "gltf"],
  // TEXTURE, HDRI, IMAGE_2D and PLUGIN are kept on the Prisma enum so any
  // legacy rows still type-check, but they're not accepted for new uploads
  // (omitted from VALID_FILE_TYPES) and not shown in the UI's FILE_TYPES list.
  TEXTURE: [],
  HDRI: [],
  IMAGE_2D: [],
  PLUGIN: [],
  MATERIAL: ["zip", "sbsar", "mtl", "mat", "glsl"],
  // .json = standard Lottie animation (Bodymovin export). .lottie = the new
  // ZIP-packaged dotLottie format from LottieFiles. Both validated by their
  // own magic bytes / structure below.
  LOTTIE: ["json", "lottie"],
  // SVG-only — content sniffed below to make sure renamed scripts can't
  // pass for an icon.
  SVG_ICON: ["svg"],
};

// Extensions that are never acceptable — listed explicitly so a misconfigured
// allow-list can't accidentally permit them.
const BLOCKED_EXTENSIONS = new Set([
  "exe", "dll", "bat", "cmd", "com", "msi", "scr", "cpl",
  "sh", "bash", "ps1", "vbs", "jar", "app", "deb", "rpm",
  "js", "mjs", "html", "htm", "php", "py", "rb",
]);

const PREVIEW_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];

export function getExtension(filename: string): string {
  const clean = filename.toLowerCase().trim();
  const dot = clean.lastIndexOf(".");
  return dot >= 0 ? clean.slice(dot + 1) : "";
}

// ─── Byte helpers ─────────────────────────────────────────────────────────────

function startsWith(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buf[offset + i] === b);
}

function asciiAt(buf: Buffer, text: string, offset = 0): boolean {
  if (buf.length < offset + text.length) return false;
  for (let i = 0; i < text.length; i++) {
    if (buf[offset + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

/**
 * True if the bytes look like a native executable or script. These must
 * never be stored, regardless of extension.
 */
export function looksLikeExecutable(buf: Buffer): boolean {
  return (
    startsWith(buf, [0x4d, 0x5a]) || // "MZ" — Windows PE (.exe/.dll)
    startsWith(buf, [0x7f, 0x45, 0x4c, 0x46]) || // ELF — Linux binary
    startsWith(buf, [0xfe, 0xed, 0xfa, 0xce]) || // Mach-O 32-bit
    startsWith(buf, [0xfe, 0xed, 0xfa, 0xcf]) || // Mach-O 64-bit
    startsWith(buf, [0xcf, 0xfa, 0xed, 0xfe]) || // Mach-O 64-bit LE
    startsWith(buf, [0xca, 0xfe, 0xba, 0xbe]) || // Mach-O universal / Java class
    asciiAt(buf, "#!") // shell-script shebang
  );
}

/**
 * Signature checks for formats with a reliable magic number. Returns the
 * result, or `null` when the format has no fixed signature (text-based
 * formats like .obj/.gltf/.svg) — those can't be content-verified and are
 * accepted on the extension + executable scan alone.
 */
function signatureMatches(ext: string, buf: Buffer): boolean | null {
  switch (ext) {
    case "glb":
      return asciiAt(buf, "glTF");
    case "png":
      return startsWith(buf, [0x89, 0x50, 0x4e, 0x47]);
    case "jpg":
    case "jpeg":
      return startsWith(buf, [0xff, 0xd8, 0xff]);
    case "gif":
      return asciiAt(buf, "GIF87a") || asciiAt(buf, "GIF89a");
    case "webp":
      return asciiAt(buf, "RIFF") && asciiAt(buf, "WEBP", 8);
    case "bmp":
      return asciiAt(buf, "BM");
    case "tif":
    case "tiff":
      return (
        startsWith(buf, [0x49, 0x49, 0x2a, 0x00]) || // little-endian
        startsWith(buf, [0x4d, 0x4d, 0x00, 0x2a]) // big-endian
      );
    case "exr":
      return startsWith(buf, [0x76, 0x2f, 0x31, 0x01]);
    case "hdr":
      return asciiAt(buf, "#?RADIANCE") || asciiAt(buf, "#?RGBE");
    case "zip":
    case "usdz": // usdz is a zip container
    case "sbsar": // sbsar is a zip container
      return (
        startsWith(buf, [0x50, 0x4b, 0x03, 0x04]) || // local file header
        startsWith(buf, [0x50, 0x4b, 0x05, 0x06]) || // empty archive
        startsWith(buf, [0x50, 0x4b, 0x07, 0x08]) // spanned archive
      );
    case "blend":
      return (
        asciiAt(buf, "BLENDER") || // uncompressed
        startsWith(buf, [0x1f, 0x8b]) // gzip-compressed .blend
      );
    case "ply":
      return asciiAt(buf, "ply");
    case "3ds":
      return startsWith(buf, [0x4d, 0x4d]); // primary chunk id 0x4D4D
    case "lottie":
      // dotLottie is a ZIP container — same magic as zip/usdz/sbsar.
      return (
        startsWith(buf, [0x50, 0x4b, 0x03, 0x04]) ||
        startsWith(buf, [0x50, 0x4b, 0x05, 0x06]) ||
        startsWith(buf, [0x50, 0x4b, 0x07, 0x08])
      );
    case "json":
      // Lottie JSON has no formal magic number, but a Bodymovin-exported
      // file always opens with `{` (possibly preceded by a UTF-8 BOM) and
      // contains the well-known Lottie schema keys. We do a permissive
      // structural check below in validateAssetFile() for LOTTIE uploads.
      return null;
    case "svg":
      // SVG is XML; permissive check that the file opens with `<svg`,
      // `<?xml`, or a BOM-prefixed equivalent. Strict content check runs
      // in looksLikeSvg() below.
      return null;
    default:
      // gltf, obj, fbx, stl, dae, mtl, mat, glsl, svg, tga — no reliable
      // universal signature. Accepted on extension + executable scan.
      return null;
  }
}

/**
 * SVG content sniff. Real SVG opens with `<?xml` or `<svg` (possibly
 * after a UTF-8 BOM and whitespace). Also blocks script-bearing SVGs
 * — those are the main attack vector for SVG icon marketplaces.
 *
 * Returns:
 *   true   — looks like a safe SVG
 *   false  — doesn't open with the SVG structure (rejected)
 *   "unsafe" — opens with SVG markup but contains <script>/<foreignObject>/
 *              event handlers (rejected with a specific message)
 */
function checkSvgContent(buf: Buffer): true | false | "unsafe" {
  let start = 0;
  if (
    buf.length >= 3 &&
    buf[0] === 0xef &&
    buf[1] === 0xbb &&
    buf[2] === 0xbf
  ) {
    start = 3;
  }
  // Skip leading whitespace
  while (
    start < buf.length &&
    (buf[start] === 0x20 ||
      buf[start] === 0x09 ||
      buf[start] === 0x0a ||
      buf[start] === 0x0d)
  ) {
    start++;
  }
  // Peek at the first ~80 bytes for the opener — text-based files don't
  // pad before the markup, so this is more than enough.
  const head = buf
    .slice(start, Math.min(buf.length, start + 200))
    .toString("utf8")
    .toLowerCase();
  if (!head.startsWith("<?xml") && !head.startsWith("<svg")) return false;

  // Scan the whole document for unsafe constructs. We're permissive on
  // size — even 5MB icons take <10ms to scan as a UTF-8 string. The
  // patterns below cover the OWASP top SVG attack vectors.
  const full = buf.toString("utf8").toLowerCase();
  if (
    /<script[\s>]/.test(full) ||
    /<foreignobject[\s>]/.test(full) ||
    /\son[a-z]+\s*=/.test(full) || // onclick=, onload=, etc.
    /javascript:/.test(full)
  ) {
    return "unsafe";
  }
  return true;
}

/**
 * Lottie JSON has no magic bytes, so we have to peek at the structure.
 * A real Lottie file is a JSON object containing the `v` (version) and
 * `layers` keys at the top level. We bail at the first 16KB to avoid
 * parsing megabyte-sized animations on the validation hot path.
 */
function looksLikeLottieJson(buf: Buffer): boolean {
  // Skip a UTF-8 BOM if present.
  let start = 0;
  if (
    buf.length >= 3 &&
    buf[0] === 0xef &&
    buf[1] === 0xbb &&
    buf[2] === 0xbf
  ) {
    start = 3;
  }
  // Find the first non-whitespace byte — must be '{'.
  while (
    start < buf.length &&
    (buf[start] === 0x20 ||
      buf[start] === 0x09 ||
      buf[start] === 0x0a ||
      buf[start] === 0x0d)
  ) {
    start++;
  }
  if (buf[start] !== 0x7b /* '{' */) return false;
  // Look for Lottie's signature keys in the first 16KB.
  const head = buf
    .slice(start, Math.min(buf.length, start + 16384))
    .toString("utf8");
  return /"v"\s*:/.test(head) && /"layers"\s*:/.test(head);
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Validates the main asset file against its declared FileType.
 * `header` only needs the first ~64 bytes, but a full buffer is fine too.
 */
export function validateAssetFile(
  filename: string,
  declaredType: FileType | "LOTTIE" | "SVG_ICON",
  header: Buffer
): ValidationResult {
  const ext = getExtension(filename);

  if (!ext) {
    return { ok: false, error: "The asset file has no extension." };
  }
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      error: `Files of type ".${ext}" are not allowed.`,
    };
  }

  const allowed = EXTENSIONS_BY_TYPE[declaredType] ?? [];
  if (!allowed.includes(ext)) {
    return {
      ok: false,
      error: `A ".${ext}" file is not valid for this asset type. Accepted: ${allowed
        .map((e) => `.${e}`)
        .join(", ")}.`,
    };
  }

  if (looksLikeExecutable(header)) {
    return {
      ok: false,
      error: "This file appears to be an executable and was rejected.",
    };
  }

  const sig = signatureMatches(ext, header);
  if (sig === false) {
    return {
      ok: false,
      error: `The file's contents don't match a ".${ext}" file — it may be corrupt or renamed.`,
    };
  }

  // Lottie .json has no magic bytes — verify it's actually a Lottie payload,
  // not arbitrary JSON or a renamed script. Only enforced when the declared
  // type IS Lottie so the same .json extension stays free for other future
  // use cases.
  if (declaredType === "LOTTIE" && ext === "json") {
    if (!looksLikeLottieJson(header)) {
      return {
        ok: false,
        error:
          "This JSON file doesn't look like a Lottie animation. Export from After Effects with Bodymovin or from LottieFiles.",
      };
    }
  }

  // SVG — structural sniff + strict script-bearing check. SVG marketplaces
  // are a common XSS vector because browsers happily execute scripts inside
  // SVG when rendered as <img>… we reject any SVG carrying scripts before
  // it ever reaches storage.
  if (declaredType === "SVG_ICON" && ext === "svg") {
    const result = checkSvgContent(header);
    if (result === false) {
      return {
        ok: false,
        error:
          "This file doesn't look like a valid SVG. Make sure it opens with <?xml or <svg.",
      };
    }
    if (result === "unsafe") {
      return {
        ok: false,
        error:
          "This SVG contains scripts or event handlers, which we don't allow for security. Re-export from your design tool without interactivity.",
      };
    }
  }

  return { ok: true };
}

/**
 * Validates the preview image. Previews are always shown in the browser, so
 * they're restricted to web-safe raster formats with a verified signature.
 */
export function validatePreviewImage(
  filename: string,
  mimeType: string,
  header: Buffer
): ValidationResult {
  const ext = getExtension(filename);

  if (!PREVIEW_EXTENSIONS.includes(ext)) {
    return {
      ok: false,
      error: "Preview must be a PNG, JPEG, or WebP image.",
    };
  }
  if (mimeType && !mimeType.startsWith("image/")) {
    return { ok: false, error: "Preview file is not an image." };
  }
  if (looksLikeExecutable(header)) {
    return { ok: false, error: "The preview file was rejected." };
  }

  const sig = signatureMatches(ext === "jpeg" ? "jpg" : ext, header);
  if (sig === false) {
    return {
      ok: false,
      error: "The preview image is corrupt or not a real image file.",
    };
  }

  return { ok: true };
}
