import crypto from "node:crypto";
import { prisma } from "./prisma";

/**
 * Email-verification & password-reset tokens.
 *
 * Stored in the existing NextAuth `VerificationToken` table. The `identifier`
 * column is namespaced (`verify:<email>` or `reset:<email>`) so the same row
 * shape covers both flows without a separate table.
 *
 * The token VALUE stored in the DB is a SHA-256 hash of the random secret —
 * the secret itself only ever appears in the email link. Even if the DB is
 * leaked, the tokens can't be redeemed.
 */

export type TokenPurpose = "verify" | "reset";

const TTL_MS: Record<TokenPurpose, number> = {
  verify: 24 * 60 * 60 * 1000, // 24h
  reset: 60 * 60 * 1000, // 1h
};

function namespaced(purpose: TokenPurpose, email: string): string {
  return `${purpose}:${email.toLowerCase().trim()}`;
}

function hashToken(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

/**
 * Create a fresh single-use token. Returns the *plaintext secret* — caller
 * embeds it in the email link. The DB only stores the hash.
 */
export async function issueToken(
  purpose: TokenPurpose,
  email: string
): Promise<string> {
  const identifier = namespaced(purpose, email);
  const secret = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(secret);
  const expires = new Date(Date.now() + TTL_MS[purpose]);

  // Wipe any prior tokens for this purpose+email so old links stop working.
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token: tokenHash, expires },
  });

  return secret;
}

/**
 * Verify and consume a token. Returns the email it was issued for, or null
 * if the token is invalid/expired. The token is deleted on success — single
 * use only.
 */
export async function consumeToken(
  purpose: TokenPurpose,
  email: string,
  secret: string
): Promise<{ ok: true; email: string } | { ok: false; reason: "invalid" | "expired" }> {
  const identifier = namespaced(purpose, email);
  const tokenHash = hashToken(secret);

  const row = await prisma.verificationToken
    .findUnique({
      where: { identifier_token: { identifier, token: tokenHash } },
    })
    .catch(() => null);

  if (!row) return { ok: false, reason: "invalid" };

  if (row.expires.getTime() < Date.now()) {
    await prisma.verificationToken
      .delete({ where: { identifier_token: { identifier, token: tokenHash } } })
      .catch(() => {});
    return { ok: false, reason: "expired" };
  }

  await prisma.verificationToken
    .delete({ where: { identifier_token: { identifier, token: tokenHash } } })
    .catch(() => {});

  return { ok: true, email: email.toLowerCase().trim() };
}
