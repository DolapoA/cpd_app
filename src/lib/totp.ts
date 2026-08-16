import "server-only";
import crypto from "crypto";
import { Secret, TOTP } from "otpauth";
import { getDb } from "./db";

/**
 * Time-based one-time passwords, and the recovery codes that stop a lost phone
 * becoming a lost account.
 *
 * An authenticator app rather than SMS: no per-message cost, it works with no
 * signal, and it is not defeated by a SIM swap.
 */

const ISSUER = "CPD Register";
/** One step either side, so a slightly wrong device clock still works. */
const WINDOW = 1;

export function newSecret(): string {
  return new Secret({ size: 20 }).base32;
}

function totpFor(secret: string, label: string): TOTP {
  return new TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}

/** The otpauth:// URI an authenticator app expects behind a QR code. */
export function provisioningUri(secret: string, email: string): string {
  return totpFor(secret, email).toString();
}

export function verifyCode(secret: string, email: string, code: string): boolean {
  const cleaned = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  return totpFor(secret, email).validate({ token: cleaned, window: WINDOW }) !== null;
}

/* ---------------------------------------------------------------------------
   Recovery codes
--------------------------------------------------------------------------- */

/**
 * Where a freshly issued set of codes is parked while the browser follows the
 * redirect to the page that shows them. Named here rather than in actions.ts
 * because that file is "use server" and may only export async functions.
 */
export const RECOVERY_FLASH_COOKIE = "cpd_recovery_new";

const RECOVERY_COUNT = 10;
/** No 0/1/I/O — these get written down and read back by a person. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function formatted(): string {
  const bytes = crypto.randomBytes(10);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${chars.slice(0, 5)}-${chars.slice(5)}`;
}

export function hashRecoveryCode(code: string): string {
  return crypto.createHash("sha256").update(code.replace(/[\s-]/g, "").toUpperCase()).digest("hex");
}

/** Replaces any existing codes: issuing a new set must invalidate the old one. */
export async function issueRecoveryCodes(userId: number): Promise<string[]> {
  const codes = Array.from({ length: RECOVERY_COUNT }, formatted);
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.prepare("DELETE FROM recovery_codes WHERE user_id = ?").run(userId);
    for (const code of codes) {
      await tx
        .prepare("INSERT INTO recovery_codes (user_id, code_hash) VALUES (?, ?)")
        .run(userId, hashRecoveryCode(code));
    }
  });
  return codes;
}

/** Spends a recovery code. Returns false if it is unknown or already used. */
export async function consumeRecoveryCode(userId: number, code: string): Promise<boolean> {
  const db = await getDb();
  const row = (await db
    .prepare(
      "SELECT id FROM recovery_codes WHERE user_id = ? AND code_hash = ? AND used_at IS NULL"
    )
    .get(userId, hashRecoveryCode(code))) as { id: number } | undefined;
  if (!row) return false;
  await db
    .prepare("UPDATE recovery_codes SET used_at = ? WHERE id = ?")
    .run(new Date().toISOString(), row.id);
  return true;
}

export async function unusedRecoveryCount(userId: number): Promise<number> {
  const db = await getDb();
  const row = (await db
    .prepare("SELECT COUNT(*) AS c FROM recovery_codes WHERE user_id = ? AND used_at IS NULL")
    .get(userId)) as { c: number };
  return Number(row.c);
}
