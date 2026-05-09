/**
 * Validation + masking helpers for KYC.
 *
 * Aadhaar: 12 digits. May be entered with spaces — we strip them.
 * PAN:     5 letters + 4 digits + 1 letter (uppercase).
 * IFSC:    4 letters + 0 + 6 alphanumeric (RBI standard).
 *
 * SECURITY: never log full Aadhaar/PAN numbers. Use `maskAadhaar()` /
 * `maskPan()` before any user-facing display except in the admin review UI.
 */

export const AADHAAR_RE = /^\d{12}$/;
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const BANK_ACCOUNT_RE = /^\d{9,18}$/;

export function normalizeAadhaar(input: string): string {
  return input.replace(/\D/g, "");
}

export function normalizePan(input: string): string {
  return input.replace(/\s/g, "").toUpperCase();
}

export function normalizeIfsc(input: string): string {
  return input.replace(/\s/g, "").toUpperCase();
}

export function isValidAadhaar(value: string): boolean {
  return AADHAAR_RE.test(normalizeAadhaar(value));
}

export function isValidPan(value: string): boolean {
  return PAN_RE.test(normalizePan(value));
}

export function isValidIfsc(value: string): boolean {
  return IFSC_RE.test(normalizeIfsc(value));
}

export function isValidBankAccount(value: string): boolean {
  return BANK_ACCOUNT_RE.test(value.replace(/\s/g, ""));
}

/** Returns a 12-digit Aadhaar masked to "XXXX XXXX 1234" (last 4 visible). */
export function maskAadhaar(num: string | null | undefined): string {
  if (!num) return "—";
  const clean = normalizeAadhaar(num);
  if (clean.length !== 12) return "—";
  return `XXXX XXXX ${clean.slice(-4)}`;
}

/** Returns a PAN masked to "ABCDE××××F" (5+last visible, middle digits hidden). */
export function maskPan(value: string | null | undefined): string {
  if (!value) return "—";
  const clean = normalizePan(value);
  if (!PAN_RE.test(clean)) return "—";
  return `${clean.slice(0, 5)}××××${clean.slice(-1)}`;
}

/** Returns "XXXX XXXX 9876" (last 4 visible). */
export function maskBankAccount(value: string | null | undefined): string {
  if (!value) return "—";
  const clean = value.replace(/\s/g, "");
  if (clean.length < 4) return "—";
  return `${"X".repeat(Math.max(0, clean.length - 4))} ${clean.slice(-4)}`.trim();
}

export const KYC_STATUS_LABEL: Record<string, string> = {
  UNVERIFIED: "Not started",
  PENDING: "Under review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export const KYC_STATUS_COLOR: Record<string, string> = {
  UNVERIFIED: "text-muted bg-elevated border-border",
  PENDING: "text-gold bg-gold-muted border-gold/20",
  VERIFIED: "text-info bg-info-muted border-info/20",
  REJECTED: "text-danger bg-danger-muted border-danger/20",
};
