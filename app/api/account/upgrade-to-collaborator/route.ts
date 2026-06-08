import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { savePublic, deletePublic } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_SAMPLE_BYTES = 5 * 1024 * 1024; // 5 MB per sample image
const MAX_SAMPLES = 3;
const MIN_DEMO_NOTE = 50;
const MAX_DEMO_NOTE = 2000;
const PREVIEW_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
const PREVIEW_MIME = /^image\/(png|jpe?g|webp)$/i;

/**
 * Validates that a portfolio URL looks like a real http(s) link with a
 * non-empty hostname. Permissive on path / query / hash. Returns null
 * when the input is empty (portfolio URL is optional).
 */
function normalisePortfolio(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname || url.hostname.length < 3) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function getExtension(name: string): string {
  const dot = name.toLowerCase().lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/**
 * Submit (or re-submit) a Collaborator application.
 *
 * Body: multipart/form-data with
 *   • portfolioUrl  — optional, http(s) URL
 *   • demoNote      — required, 50-2000 chars (self-introduction)
 *   • sample0/1/2   — optional, PNG/JPG/WebP, ≤5MB each
 *
 * Allowed transitions:
 *   NONE      → PENDING   (first-time upgrade)
 *   REJECTED  → PENDING   (re-apply after a previous decline)
 *
 * Blocked: PENDING (already waiting), APPROVED (already a Collaborator),
 * ADMIN (doesn't need this flow).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // 5 / hour / IP — keeps the admin queue honest.
  const rl = checkRateLimit(req, "upgrade-collaborator", {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      creatorStatus: true,
      creatorSampleKeys: true,
    },
  });
  if (!me) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (me.role === "ADMIN") {
    return NextResponse.json(
      { error: "Admins don't need to apply as collaborators." },
      { status: 400 }
    );
  }
  if (me.role === "CREATOR" || me.creatorStatus === "APPROVED") {
    return NextResponse.json(
      { error: "You're already a Collaborator." },
      { status: 400 }
    );
  }
  if (me.creatorStatus === "PENDING") {
    return NextResponse.json(
      { error: "Your application is already pending review." },
      { status: 400 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not parse application." },
      { status: 400 }
    );
  }

  const portfolioRaw = String(form.get("portfolioUrl") ?? "");
  const demoNote = String(form.get("demoNote") ?? "").trim();
  const portfolioUrl = normalisePortfolio(portfolioRaw);

  if (portfolioRaw.trim().length > 0 && !portfolioUrl) {
    return NextResponse.json(
      {
        error:
          "Portfolio URL is invalid. Use a full https:// link or leave it blank.",
      },
      { status: 400 }
    );
  }

  if (demoNote.length < MIN_DEMO_NOTE || demoNote.length > MAX_DEMO_NOTE) {
    return NextResponse.json(
      {
        error: `Tell us about your work in ${MIN_DEMO_NOTE}-${MAX_DEMO_NOTE} characters.`,
      },
      { status: 400 }
    );
  }

  // Pull sample images out of the form. Indexed slots keep the per-slot
  // validation messages clear ("Sample 2 is too large…" rather than a
  // generic "one of your samples is broken").
  const samples: File[] = [];
  for (let i = 0; i < MAX_SAMPLES; i++) {
    const f = form.get(`sample${i}`);
    if (f instanceof File && f.size > 0) samples.push(f);
  }

  // Save samples to public R2. Roll back any successful uploads if a
  // later one fails — no orphaned blobs sitting in the bucket.
  const savedUrls: string[] = [];
  try {
    for (let i = 0; i < samples.length; i++) {
      const f = samples[i];
      if (f.size > MAX_SAMPLE_BYTES) {
        throw new Error(`Sample ${i + 1} exceeds 5 MB.`);
      }
      const ext = getExtension(f.name);
      if (!PREVIEW_EXTENSIONS.includes(ext)) {
        throw new Error(
          `Sample ${i + 1} must be a PNG, JPEG, or WebP image.`
        );
      }
      if (f.type && !PREVIEW_MIME.test(f.type)) {
        throw new Error(`Sample ${i + 1} is not a valid image.`);
      }
      const buf = Buffer.from(await f.arrayBuffer());
      const saved = await savePublic(
        `collaborator-samples/${session.user.id}`,
        f.name || `sample-${i + 1}.png`,
        buf
      );
      savedUrls.push(saved.url);
    }
  } catch (err) {
    for (const url of savedUrls) await deletePublic(url);
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Best-effort cleanup of any prior samples from a previous attempt so
  // the bucket doesn't accumulate stale blobs across re-applications.
  for (const oldUrl of me.creatorSampleKeys) {
    await deletePublic(oldUrl);
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      creatorStatus: "PENDING",
      // Clear the prior decision timestamp so admin tooling correctly
      // treats this as a fresh application, not a stale one.
      creatorDecidedAt: null,
      creatorPortfolioUrl: portfolioUrl,
      creatorDemoNote: demoNote,
      creatorSampleKeys: savedUrls,
    },
  });

  return NextResponse.json({ ok: true, status: "PENDING" });
}
