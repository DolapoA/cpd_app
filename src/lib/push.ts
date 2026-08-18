import "server-only";
import webpush from "web-push";
import { getDb } from "./db";

/**
 * Web Push.
 *
 * The one channel that reaches somebody who has installed the app and is not
 * reading their email. It is deliberately not a replacement for the day-before
 * email: a push notification is delivered to a device, and a device can be
 * lost, wiped, or simply left at home. Email remains the record; this is the
 * tap on the shoulder.
 *
 * Nothing here throws upward. A push that fails is a notification nobody saw,
 * which is a smaller problem than a cron run that dies halfway through and
 * leaves the rest of the morning's notifications unsent.
 */

export type PushPayload = {
  title: string;
  body: string;
  /** Where tapping it should land. Relative to the site. */
  url: string;
  /**
   * Notifications sharing a tag replace one another rather than stacking, so
   * a phone that was off for two days shows today's reminder and not both.
   */
  tag: string;
};

export type StoredSubscription = {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type VapidState = { ok: true } | { ok: false; reason: string };

/** Only success is remembered: a failure re-checks, so fixing the environment
 *  does not also require restarting to be believed. */
let vapidOk = false;

/**
 * Configure the signing keys, and survive them being wrong.
 *
 * web-push validates the pair and *throws* on a bad one — a key that decodes
 * to the wrong length, a subject that is not a URL. Left uncaught that turns a
 * mistyped environment variable into a 500 on the settings page and a dead
 * cron run, which is the least helpful way to report a typo ever devised. The
 * validation message is kept and shown instead; it names the problem exactly
 * and contains no part of the key.
 */
function vapid(): VapidState {
  if (vapidOk) return { ok: true };

  // Trimmed because these are pasted into a dashboard by hand, and a trailing
  // newline is the single most common way to arrive at "should be 32 bytes".
  const pub = process.env.VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:info@cpdregister.app";

  if (!pub || !priv) {
    const reason = !pub && !priv
      ? "Neither VAPID_PUBLIC_KEY nor VAPID_PRIVATE_KEY is set."
      : !priv
        ? "VAPID_PRIVATE_KEY is not set."
        : "VAPID_PUBLIC_KEY is not set.";
    console.warn(`[push] ${reason} Notifications will not be sent.`);
    return { ok: false, reason };
  }

  try {
    webpush.setVapidDetails(subject, pub, priv);
    vapidOk = true;
    return { ok: true };
  } catch (error) {
    const reason = (error as Error).message || "The VAPID keys were rejected.";
    console.error("[push] VAPID keys rejected:", reason);
    return { ok: false, reason };
  }
}

/** Whether anything can be sent at all. */
export function pushConfigured(): boolean {
  return vapid().ok;
}

/** The key the browser needs in order to subscribe. Public by design. */
export function publicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

/**
 * Why nothing arrived, when nothing arrived.
 *
 * "Nought delivered" has four completely different causes and only one of them
 * is the person's own doing. Collapsing them into a number meant the settings
 * page told somebody their device was not set up when the truth was that the
 * server had no signing key — a wrong answer that sends them looking in the
 * wrong place.
 */
export type PushResult = {
  delivered: number;
  devices: number;
  /** Set when the failure is ours rather than theirs. */
  problem?: "not-configured" | "no-devices" | "rejected";
  /** The HTTP status a push service gave, when it gave one. */
  status?: number;
  detail?: string;
};

/**
 * Send to every device a person has registered.
 *
 * A subscription that comes back 404 or 410 is gone for good — the browser was
 * uninstalled, the permission revoked, the device wiped — so it is deleted
 * rather than retried forever. Any other failure is left alone: a push service
 * having a bad minute is not a reason to stop being able to reach somebody.
 */
export async function pushToUser(userId: number, payload: PushPayload): Promise<PushResult> {
  const keys = vapid();
  if (!keys.ok) {
    return { delivered: 0, devices: 0, problem: "not-configured", detail: keys.reason };
  }

  const db = await getDb();
  const subs = (await db
    .prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?")
    .all(userId)) as StoredSubscription[];
  if (subs.length === 0) return { delivered: 0, devices: 0, problem: "no-devices" };

  const body = JSON.stringify(payload);
  let delivered = 0;
  const dead: number[] = [];
  let status: number | undefined;
  let detail: string | undefined;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: 12 * 60 * 60 }
        );
        delivered += 1;
      } catch (error) {
        const e = error as { statusCode?: number; body?: string; message?: string };
        if (e.statusCode === 404 || e.statusCode === 410) {
          dead.push(sub.id);
          return;
        }
        // Kept for the caller, and logged with the push service's own words —
        // "410" alone has never told anybody what to do next.
        status = e.statusCode;
        detail = (e.body || e.message || "").slice(0, 200);
        // The host is only for the log line, so a malformed endpoint must not
        // become a second exception thrown from inside the handler for the
        // first — which would escape this catch entirely.
        let host = "a push service";
        try {
          host = new URL(sub.endpoint).host;
        } catch {
          host = "an unreadable endpoint";
        }
        console.error(`[push] ${host} refused it:`, e.statusCode ?? "no status", detail);
      }
    })
  );

  if (dead.length > 0) {
    await db.prepare("DELETE FROM push_subscriptions WHERE id = ANY(?)").run(dead);
  }
  if (delivered > 0) {
    await db
      .prepare("UPDATE push_subscriptions SET last_used_at = ? WHERE user_id = ?")
      .run(new Date().toISOString(), userId);
  }

  if (delivered > 0) return { delivered, devices: subs.length };
  // Every device having just been deleted is a different story from a push
  // service refusing a live one, and the person needs to be told the right one.
  const problem: PushResult["problem"] = dead.length === subs.length ? "no-devices" : "rejected";
  return { delivered, devices: subs.length, problem, status, detail };
}

/** How many devices this person could be reached on. */
export async function deviceCount(userId: number): Promise<number> {
  const db = await getDb();
  const row = (await db
    .prepare("SELECT COUNT(*) AS c FROM push_subscriptions WHERE user_id = ?")
    .get(userId)) as { c: string };
  return Number(row.c);
}
