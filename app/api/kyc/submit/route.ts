import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savePrivate, deletePrivate } from "@/lib/storage";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  isValidAadhaar,
  isValidPan,
  isValidIfsc,
  isValidBankAccount,
  normalizeAadhaar,
  normalizePan,
  normalizeIfsc,
} from "@/lib/kyc";

export const runtime = "nodejs";

const MAX_DOC_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export async function POST(req: Request) {
  // Tight rate limit — KYC submissions involve PII, so spammers shouldn't get
  // many free attempts.
  const rl = await checkRateLimit(req, "kyc-submit", {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not parse upload." },
      { status: 400 }
    );
  }

  const legalName = String(form.get("legalName") ?? "").trim();
  const aadhaarRaw = String(form.get("aadhaarNumber") ?? "").trim();
  const panRaw = String(form.get("panNumber") ?? "").trim();
  const bankAccountName = String(form.get("bankAccountName") ?? "").trim();
  const bankAccount = String(form.get("bankAccount") ?? "").trim();
  const bankIfscRaw = String(form.get("bankIfsc") ?? "").trim();
  const bankName = String(form.get("bankName") ?? "").trim();

  const aadhaarFront = form.get("aadhaarFront");
  const aadhaarBack = form.get("aadhaarBack");
  const panFile = form.get("pan");

  // ─── Validation ──────────────────────────────────────────────────────────

  if (legalName.length < 2 || legalName.length > 100) {
    return NextResponse.json(
      { error: "Legal name must be 2–100 characters." },
      { status: 400 }
    );
  }
  if (!isValidAadhaar(aadhaarRaw)) {
    return NextResponse.json(
      { error: "Aadhaar number must be 12 digits." },
      { status: 400 }
    );
  }
  if (!isValidPan(panRaw)) {
    return NextResponse.json(
      { error: "PAN must be in the format ABCDE1234F." },
      { status: 400 }
    );
  }
  if (bankAccountName.length < 2 || bankAccountName.length > 100) {
    return NextResponse.json(
      { error: "Bank account name must be 2–100 characters." },
      { status: 400 }
    );
  }
  if (!isValidBankAccount(bankAccount)) {
    return NextResponse.json(
      { error: "Bank account number must be 9–18 digits." },
      { status: 400 }
    );
  }
  if (!isValidIfsc(bankIfscRaw)) {
    return NextResponse.json(
      { error: "IFSC code is invalid." },
      { status: 400 }
    );
  }
  if (bankName.length < 2 || bankName.length > 100) {
    return NextResponse.json(
      { error: "Bank name is required." },
      { status: 400 }
    );
  }

  for (const [name, file] of [
    ["aadhaarFront", aadhaarFront],
    ["aadhaarBack", aadhaarBack],
    ["pan", panFile],
  ] as const) {
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: `Document missing: ${name}.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_DOC_BYTES) {
      return NextResponse.json(
        { error: `Document too large: ${name} (max 5 MB).` },
        { status: 400 }
      );
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Document must be PNG/JPEG/WebP: ${name}.` },
        { status: 400 }
      );
    }
  }

  // Block re-submission while already PENDING — user must withdraw first
  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      kycStatus: true,
      aadhaarKey: true,
      aadhaarBackKey: true,
      panKey: true,
    },
  });
  if (!current) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (current.kycStatus === "PENDING") {
    return NextResponse.json(
      { error: "You already have a pending submission. Withdraw it first." },
      { status: 400 }
    );
  }
  if (current.kycStatus === "VERIFIED") {
    return NextResponse.json(
      { error: "Your KYC is already verified. Contact support to update." },
      { status: 400 }
    );
  }

  // ─── Save documents ──────────────────────────────────────────────────────

  const subdir = `kyc/${session.user.id}`;
  const savedKeys: string[] = [];

  try {
    const frontBuf = Buffer.from(
      await (aadhaarFront as File).arrayBuffer()
    );
    const front = await savePrivate(
      subdir,
      `aadhaar-front-${(aadhaarFront as File).name}`,
      frontBuf
    );
    savedKeys.push(front.key);

    const backBuf = Buffer.from(
      await (aadhaarBack as File).arrayBuffer()
    );
    const back = await savePrivate(
      subdir,
      `aadhaar-back-${(aadhaarBack as File).name}`,
      backBuf
    );
    savedKeys.push(back.key);

    const panBuf = Buffer.from(await (panFile as File).arrayBuffer());
    const pan = await savePrivate(
      subdir,
      `pan-${(panFile as File).name}`,
      panBuf
    );
    savedKeys.push(pan.key);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        legalName,
        aadhaarNumber: normalizeAadhaar(aadhaarRaw),
        aadhaarKey: front.key,
        aadhaarBackKey: back.key,
        panNumber: normalizePan(panRaw),
        panKey: pan.key,
        bankAccountName,
        bankAccount,
        bankIfsc: normalizeIfsc(bankIfscRaw),
        bankName,
        kycStatus: "PENDING",
        kycSubmittedAt: new Date(),
        kycRejectionNote: null,
      },
    });

    // Best-effort cleanup of documents from a previous (rejected) submission
    if (current.aadhaarKey && current.aadhaarKey !== front.key) {
      await deletePrivate(current.aadhaarKey);
    }
    if (current.aadhaarBackKey && current.aadhaarBackKey !== back.key) {
      await deletePrivate(current.aadhaarBackKey);
    }
    if (current.panKey && current.panKey !== pan.key) {
      await deletePrivate(current.panKey);
    }

    return NextResponse.json({ ok: true, status: "PENDING" });
  } catch (err) {
    // Roll back any files we managed to save
    for (const key of savedKeys) {
      await deletePrivate(key);
    }
    console.error("[kyc submit] failed:", err);
    return NextResponse.json(
      { error: "Could not save submission. Please try again." },
      { status: 500 }
    );
  }
}
