/**
 * RazorpayX payouts integration.
 *
 * RazorpayX is a SEPARATE product from Razorpay Payments. It uses different
 * endpoints, separate API keys, and requires a Razorpay business account with
 * a RazorpayX wallet/current account funded.
 *
 * Three-step payout flow:
 *   1. Create a Contact     (one-time per creator — cached on User)
 *   2. Create a Fund Account linked to that contact (one-time per bank)
 *   3. Create a Payout       (per request)
 *
 * If RAZORPAY_X_* env vars are missing, every helper returns null/false and
 * the admin route falls back to manual mode (admin updates status by hand
 * after sending money offline).
 */

import { prisma } from "@/lib/prisma";

const BASE_URL = "https://api.razorpay.com/v1";

export function isRazorpayXConfigured(): boolean {
  return !!(
    process.env.RAZORPAY_X_KEY_ID &&
    process.env.RAZORPAY_X_KEY_SECRET &&
    process.env.RAZORPAY_X_ACCOUNT_NUMBER
  );
}

function authHeader(): string {
  const id = process.env.RAZORPAY_X_KEY_ID!;
  const secret = process.env.RAZORPAY_X_KEY_SECRET!;
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

async function rx<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...(init.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = data as { error?: { description?: string } };
    throw new Error(
      err.error?.description ?? `RazorpayX ${path} failed (${res.status})`
    );
  }
  return data as T;
}

interface ContactResponse { id: string }
interface FundAccountResponse { id: string }
interface PayoutResponse {
  id: string;
  status: string;
  failure_reason?: string;
}

/**
 * Ensures the creator has a RazorpayX contact + fund_account.
 * Caches the IDs on the User row so subsequent payouts skip both creation
 * calls and hit the payouts API directly.
 */
async function ensureContactAndFundAccount(creatorId: string): Promise<{
  contactId: string;
  fundAccountId: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: creatorId },
    select: {
      id: true,
      name: true,
      email: true,
      legalName: true,
      bankAccountName: true,
      bankAccount: true,
      bankIfsc: true,
      razorpayContactId: true,
      razorpayFundAccountId: true,
    },
  });
  if (!user) throw new Error("Creator not found.");
  if (
    !user.bankAccountName ||
    !user.bankAccount ||
    !user.bankIfsc
  ) {
    throw new Error("Creator's bank details are missing (KYC not complete).");
  }

  let contactId = user.razorpayContactId;
  if (!contactId) {
    const contact = await rx<ContactResponse>("/contacts", {
      method: "POST",
      body: JSON.stringify({
        name: user.legalName ?? user.name ?? "Creator",
        email: user.email,
        type: "vendor",
        reference_id: user.id,
      }),
    });
    contactId = contact.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { razorpayContactId: contactId },
    });
  }

  let fundAccountId = user.razorpayFundAccountId;
  if (!fundAccountId) {
    const fa = await rx<FundAccountResponse>("/fund_accounts", {
      method: "POST",
      body: JSON.stringify({
        contact_id: contactId,
        account_type: "bank_account",
        bank_account: {
          name: user.bankAccountName,
          ifsc: user.bankIfsc,
          account_number: user.bankAccount,
        },
      }),
    });
    fundAccountId = fa.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { razorpayFundAccountId: fundAccountId },
    });
  }

  return { contactId, fundAccountId };
}

/**
 * Triggers a real RazorpayX payout to the creator's bank.
 * Returns the RazorpayX payout ID + initial status, or throws on failure.
 *
 * Idempotent: the X-Payout-Idempotency header ensures Razorpay deduplicates
 * if the admin clicks twice or a retry storms in.
 */
export async function createRazorpayXPayout(params: {
  payoutId: string;        // our internal Payout.id
  creatorId: string;
  amountInPaise: number;
}): Promise<{ razorpayPayoutId: string; status: string }> {
  if (!isRazorpayXConfigured()) {
    throw new Error("RazorpayX is not configured.");
  }

  const { fundAccountId } = await ensureContactAndFundAccount(params.creatorId);

  const payout = await rx<PayoutResponse>("/payouts", {
    method: "POST",
    headers: { "X-Payout-Idempotency": params.payoutId },
    body: JSON.stringify({
      account_number: process.env.RAZORPAY_X_ACCOUNT_NUMBER,
      fund_account_id: fundAccountId,
      amount: params.amountInPaise,
      currency: "INR",
      mode: "IMPS",
      purpose: "payout",
      queue_if_low_balance: true,
      reference_id: params.payoutId,
      narration: "Designo creator payout",
    }),
  });

  return { razorpayPayoutId: payout.id, status: payout.status };
}

/**
 * Maps a RazorpayX payout status to our internal PayoutStatus enum.
 * RazorpayX statuses: queued, pending, rejected, processing, processed,
 * cancelled, reversed, failed.
 */
export function mapRazorpayXStatus(
  s: string
): "PENDING" | "PROCESSING" | "PAID" | "FAILED" {
  switch (s) {
    case "processed":
      return "PAID";
    case "failed":
    case "cancelled":
    case "reversed":
    case "rejected":
      return "FAILED";
    case "queued":
    case "pending":
      return "PENDING";
    case "processing":
    default:
      return "PROCESSING";
  }
}
