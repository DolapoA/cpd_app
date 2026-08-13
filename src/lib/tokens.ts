import "server-only";
import crypto from "crypto";
import { getDb } from "./db";

/**
 * Single-use, expiring tokens for password reset and email confirmation.
 *
 * Only a hash is stored. A reset link is a bearer credential, so a database
 * that leaks should not hand over working ones — the same argument as for
 * password hashes.
 */
export type TokenPurpose = "reset" | "verify";

const LIFETIME_MS: Record<TokenPurpose, number> = {
  reset: 60 * 60 * 1000, // an hour: long enough to find the email, short enough to matter
  verify: 24 * 60 * 60 * 1000,
};

function hash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueToken(
  userId: number,
  email: string,
  purpose: TokenPurpose
): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  const db = await getDb();
  // Only the newest link should work; older ones for the same purpose are spent.
  await db
    .prepare("DELETE FROM auth_tokens WHERE user_id = ? AND purpose = ?")
    .run(userId, purpose);
  await db
    .prepare(
      "INSERT INTO auth_tokens (token_hash, user_id, purpose, email, expires_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(
      hash(token),
      userId,
      purpose,
      email,
      new Date(Date.now() + LIFETIME_MS[purpose]).toISOString()
    );
  return token;
}

export type ClaimedToken = { user_id: number; email: string };

/** Verifies and spends a token. Returns null if it is unknown, used or expired. */
export async function claimToken(
  token: string,
  purpose: TokenPurpose
): Promise<ClaimedToken | null> {
  const db = await getDb();
  const row = (await db
    .prepare(
      "SELECT user_id, email, expires_at, used_at FROM auth_tokens WHERE token_hash = ? AND purpose = ?"
    )
    .get(hash(token), purpose)) as
    | { user_id: number; email: string; expires_at: string; used_at: string | null }
    | undefined;

  if (!row || row.used_at || row.expires_at < new Date().toISOString()) return null;

  await db
    .prepare("UPDATE auth_tokens SET used_at = ? WHERE token_hash = ?")
    .run(new Date().toISOString(), hash(token));
  return { user_id: Number(row.user_id), email: row.email };
}
