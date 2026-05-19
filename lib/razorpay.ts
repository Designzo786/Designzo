import Razorpay from "razorpay";
import crypto from "crypto";

// ─── Client singleton ─────────────────────────────────────────────────────────
// Razorpay's constructor blows up if keys are missing, so we lazy-init —
// importing this module shouldn't crash dev when Razorpay isn't configured yet.

let _client: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (_client) return _client;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
    );
  }
  _client = new Razorpay({ key_id, key_secret });
  return _client;
}

// ─── Signature verification ───────────────────────────────────────────────────
// Razorpay's success callback returns `razorpay_payment_id`, `razorpay_order_id`,
// and `razorpay_signature`. The signature is HMAC-SHA256 of `${order_id}|${payment_id}`
// using the key secret. Verifying this server-side is the ONLY proof that the
// payment actually happened — the client callback can be forged.

export function verifyPaymentSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  // timingSafeEqual prevents timing attacks on the signature comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

// ─── Webhook signature verification ───────────────────────────────────────────
// Razorpay webhooks carry an `X-Razorpay-Signature` header — HMAC-SHA256 of the
// RAW request body using the webhook secret (set when you register the webhook
// in the Razorpay dashboard). This is separate from the payment-callback secret.
// Verifying it is the only proof a webhook genuinely came from Razorpay.

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

// ─── Commission helpers ───────────────────────────────────────────────────────

export const PLATFORM_COMMISSION_PCT = parseInt(
  process.env.PLATFORM_COMMISSION_PERCENT ?? "20",
  10
);

export function calcSplit(priceInPaise: number): {
  platformFee: number;
  creatorEarning: number;
} {
  const platformFee = Math.round(priceInPaise * (PLATFORM_COMMISSION_PCT / 100));
  const creatorEarning = priceInPaise - platformFee;
  return { platformFee, creatorEarning };
}
