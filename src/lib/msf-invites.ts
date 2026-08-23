import "server-only";
import crypto from "crypto";
import { getDb, type MsfInvitation, type MsfRequest } from "./db";
import { MSF_REMINDER_AFTER_DAYS } from "./msf";

/**
 * The invitation links, and the rules about time.
 *
 * Separated from ./msf.ts because that module is imported by a client
 * component and must stay free of anything that touches the database.
 */

/** Same shape as tokens.ts: 256 bits, URL-safe, handed back exactly once. */
export function newInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Today in the UK, as YYYY-MM-DD — the only precision this feature stores. */
export function ukToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(now);
}

/** A date that many days after another, both YYYY-MM-DD. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days between two YYYY-MM-DD dates. Negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

/**
 * Where a request is in its life.
 *
 * "draft" means nobody has been invited and the clock has not started;
 * "open" means colleagues can still answer and the subject sees counts only;
 * "closed" means the window has passed and the results are theirs to read.
 */
export function msfStatus(request: MsfRequest, today = ukToday()): "draft" | "open" | "closed" {
  if (!request.closes_on) return "draft";
  return today > request.closes_on ? "closed" : "open";
}

/** Whether the one reminder is available yet, and has not already been used. */
export function canRemind(request: MsfRequest, today = ukToday()): boolean {
  if (request.reminded_on || !request.opened_on) return false;
  if (msfStatus(request, today) !== "open") return false;
  return daysBetween(request.opened_on, today) >= MSF_REMINDER_AFTER_DAYS;
}

/**
 * The invitation a link belongs to, without spending it.
 *
 * Reading is deliberately separate from spending: corporate mail scanners
 * fetch every link in an incoming message, so a GET that marked the
 * invitation used would burn it before the colleague ever saw the form.
 */
export async function invitationForToken(
  token: string
): Promise<{ invitation: MsfInvitation; request: MsfRequest } | null> {
  const db = await getDb();
  const invitation = (await db
    .prepare("SELECT * FROM msf_invitations WHERE token_hash = ?")
    .get(hashInviteToken(token))) as MsfInvitation | undefined;
  if (!invitation) return null;

  const request = (await db
    .prepare("SELECT * FROM msf_requests WHERE id = ?")
    .get(invitation.request_id)) as MsfRequest | undefined;
  if (!request) return null;

  return { invitation, request };
}

/**
 * The response count as the subject may see it.
 *
 * A live tally is a quiet informer: a count that ticks up the morning after
 * you nudged one particular colleague has named them. So the subject sees the
 * figure as it stood at each weekly checkpoint — stamped here the first time
 * anyone looks after the checkpoint has passed, because the responses
 * themselves deliberately carry no dates from which to reconstruct it.
 * Returns null while the round is open but the first checkpoint has not
 * arrived; the live figure only once the round has closed.
 */
export async function visibleReplyCount(request: MsfRequest): Promise<number | null> {
  const db = await getDb();
  const live = Number(
    ((await db
      .prepare("SELECT COALESCE(SUM(responded), 0) AS c FROM msf_invitations WHERE request_id = ?")
      .get(request.id)) as { c: string }).c
  );

  if (msfStatus(request) === "closed") return live;
  if (!request.opened_on) return null;

  const day = daysBetween(request.opened_on, ukToday());
  if (day >= 14) {
    if (request.replies_at_day14 === null) {
      await db
        .prepare("UPDATE msf_requests SET replies_at_day14 = ? WHERE id = ? AND replies_at_day14 IS NULL")
        .run(live, request.id);
      return live;
    }
    return request.replies_at_day14;
  }
  if (day >= 7) {
    if (request.replies_at_day7 === null) {
      await db
        .prepare("UPDATE msf_requests SET replies_at_day7 = ? WHERE id = ? AND replies_at_day7 IS NULL")
        .run(live, request.id);
      return live;
    }
    return request.replies_at_day7;
  }
  return null;
}
