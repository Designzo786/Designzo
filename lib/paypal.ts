import {
  Client,
  Environment,
  OrdersController,
  PaymentsController,
} from "@paypal/paypal-server-sdk";

// ─── Client singleton ─────────────────────────────────────────────────────────

const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID!,
    oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET!,
  },
  environment:
    process.env.PAYPAL_MODE === "live"
      ? Environment.Production
      : Environment.Sandbox,
});

export const ordersController = new OrdersController(paypalClient);
export const paymentsController = new PaymentsController(paypalClient);

// ─── Commission helpers ───────────────────────────────────────────────────────

export const PLATFORM_COMMISSION_PCT = parseInt(
  process.env.PLATFORM_COMMISSION_PERCENT ?? "20",
  10
);

export function calcSplit(priceCents: number): {
  platformFee: number;
  creatorEarning: number;
} {
  const platformFee = Math.round(priceCents * (PLATFORM_COMMISSION_PCT / 100));
  const creatorEarning = priceCents - platformFee;
  return { platformFee, creatorEarning };
}

/** Converts USD cents to a PayPal-compatible decimal string ("10.99") */
export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Converts a PayPal decimal string back to cents */
export function decimalToCents(value: string): number {
  return Math.round(parseFloat(value) * 100);
}
