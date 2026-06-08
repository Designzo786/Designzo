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
  // MATERIAL stays on the enum for the few legacy rows still tagged with
  // it, but is no longer offered as an upload target — empty allowlist
  // rejects any new MATERIAL upload at validation.
  MATERIAL: [],
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
    case "fbx":
      // Binary FBX: ASCII "Kaydara FBX Binary" preamble. ASCII FBX
      // (rare in marketplace pipelines): file opens with "; FBX " or
      // the "FBXHeaderExtension" token within the first few bytes.
      return (
        asciiAt(buf, "Kaydara FBX Binary") ||
        asciiAt(buf, "; FBX") ||
        asciiAt(buf, "; FBX ") ||
        /^.{0,128}FBXHeaderExtension/.test(
          buf.slice(0, 256).toString("utf8")
        )
      );
    case "usdz":
      // USDZ is a ZIP container — same magic as zip / sbsar.
      return (
        startsWith(buf, [0x50, 0x4b, 0x03, 0x04]) ||
        startsWith(buf, [0x50, 0x4b, 0x05, 0x06]) ||
        startsWith(buf, [0x50, 0x4b, 0x07, 0x08])
      );
    case "mp4":
    case "m4v":
    case "mov":
      // MP4/MOV files use the ISO BMFF container — first 4 bytes are the
      // size of the first box, followed by `ftyp` at byte 4. Most files
      // also have a brand at byte 8 (isom, mp42, qt, avc1, etc.) but
      // checking `ftyp` is sufficient and cross-encoder safe.
      return asciiAt(buf, "ftyp", 4);
    case "webm":
      // EBML magic — shared with MKV.
      return startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3]);
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
 * A real Lottie animation is a JSON object whose top-level keys overlap
 * with the Bodymovin / Lottie spec — `v` (version), `fr` (framerate),
 * `ip` / `op` (in/out point), `layers`, `assets`, `animations`. Older
 * Bodymovin exports always carry `v` + `layers`; newer dotLottie-style
 * exports and partial exports may drop one of those. We accept the file
 * if at least one of these well-known keys appears in the first 32KB —
 * keeps the structural sanity check without rejecting valid Lottie
 * variants that legitimate exporters produce.
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
  // Accept the file if any Lottie-typical key appears in the first 32KB.
  const head = buf
    .slice(start, Math.min(buf.length, start + 32768))
    .toString("utf8");
  return /"(v|fr|ip|op|layers|assets|animations|markers)"\s*:/.test(head);
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

// Extensions accepted for the optional Lottie companion uploads. Each slot is
// single-format on purpose — keeps the picker UX simple and the magic-byte
// check exact.
const LOTTIE_GIF_EXTENSIONS = ["gif"];
const LOTTIE_MP4_EXTENSIONS = ["mp4"];

/**
 * Validate an optional Lottie GIF companion. Same magic-byte family as the
 * preview image GIF check — GIF87a or GIF89a.
 */
export function validateLottieGif(
  filename: string,
  header: Buffer
): ValidationResult {
  const ext = getExtension(filename);
  if (!LOTTIE_GIF_EXTENSIONS.includes(ext)) {
    return { ok: false, error: "Lottie GIF companion must be a .gif file." };
  }
  if (looksLikeExecutable(header)) {
    return { ok: false, error: "GIF companion was rejected." };
  }
  const sig = signatureMatches("gif", header);
  if (sig === false) {
    return {
      ok: false,
      error: "The GIF file is corrupt or not a real GIF.",
    };
  }
  return { ok: true };
}

/**
 * Validate an optional Lottie MP4 companion. The MP4 brand is checked via
 * the ISO BMFF `ftyp` box at byte 4 (see signatureMatches above).
 */
export function validateLottieMp4(
  filename: string,
  header: Buffer
): ValidationResult {
  const ext = getExtension(filename);
  if (!LOTTIE_MP4_EXTENSIONS.includes(ext)) {
    return { ok: false, error: "Lottie MP4 companion must be a .mp4 file." };
  }
  if (looksLikeExecutable(header)) {
    return { ok: false, error: "MP4 companion was rejected." };
  }
  const sig = signatureMatches("mp4", header);
  if (sig === false) {
    return {
      ok: false,
      error:
        "The MP4 file is corrupt or not a real MP4 (missing ISO BMFF ftyp box).",
    };
  }
  return { ok: true };
}

// 3D companion uploads. The MAIN model file stays .glb/.gltf (web preview
// + the format the AssetViewer can render in browser). Each of these is
// an alternate-format export the creator can ship alongside it.
const MODEL_FBX_EXTENSIONS = ["fbx"];
const MODEL_OBJ_EXTENSIONS = ["obj"];
const MODEL_USDZ_EXTENSIONS = ["usdz"];

export function validateModelFbx(
  filename: string,
  header: Buffer
): ValidationResult {
  const ext = getExtension(filename);
  if (!MODEL_FBX_EXTENSIONS.includes(ext)) {
    return { ok: false, error: "FBX companion must be a .fbx file." };
  }
  if (looksLikeExecutable(header)) {
    return { ok: false, error: "FBX companion was rejected." };
  }
  const sig = signatureMatches("fbx", header);
  if (sig === false) {
    return {
      ok: false,
      error: "The FBX file is corrupt or not a real FBX (no Kaydara header).",
    };
  }
  return { ok: true };
}

/**
 * OBJ is plain ASCII text — no magic bytes. We verify it isn't an
 * executable and that the start of the file looks like Wavefront OBJ
 * markup: a comment, a vertex / face / group line, or `mtllib` /
 * `usemtl` references.
 */
export function validateModelObj(
  filename: string,
  header: Buffer
): ValidationResult {
  const ext = getExtension(filename);
  if (!MODEL_OBJ_EXTENSIONS.includes(ext)) {
    return { ok: false, error: "OBJ companion must be a .obj file." };
  }
  if (looksLikeExecutable(header)) {
    return { ok: false, error: "OBJ companion was rejected." };
  }
  // Skip leading whitespace / BOM, then verify the first non-blank line
  // starts with one of the standard OBJ tokens.
  let start = 0;
  if (
    header.length >= 3 &&
    header[0] === 0xef &&
    header[1] === 0xbb &&
    header[2] === 0xbf
  ) {
    start = 3;
  }
  const head = header.slice(start, Math.min(header.length, start + 2048)).toString("utf8");
  // First 2KB should contain at least one OBJ line beginning. Permissive
  // on whitespace and line endings.
  if (!/(^|\n)\s*(#|v\s|vn\s|vt\s|vp\s|f\s|g\s|o\s|s\s|l\s|mtllib\s|usemtl\s)/.test(head)) {
    return {
      ok: false,
      error: "This file doesn't look like a Wavefront OBJ export.",
    };
  }
  return { ok: true };
}

export function validateModelUsdz(
  filename: string,
  header: Buffer
): ValidationResult {
  const ext = getExtension(filename);
  if (!MODEL_USDZ_EXTENSIONS.includes(ext)) {
    return { ok: false, error: "USDZ companion must be a .usdz file." };
  }
  if (looksLikeExecutable(header)) {
    return { ok: false, error: "USDZ companion was rejected." };
  }
  const sig = signatureMatches("usdz", header);
  if (sig === false) {
    return {
      ok: false,
      error: "The USDZ file is corrupt or not a valid ZIP container.",
    };
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
