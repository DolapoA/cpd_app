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

let configured: boolean | null = null;

/**
 * Push is off until the keys are set, and says so once rather than on every
 * send — a log line per notification would bury everything else.
 */
export function pushConfigured(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    if (configured === null) {
      console.warn("[push] VAPID keys not set — notifications will not be sent.");
      configured = false;
    }
    return false;
  }
  if (configured !== true) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:info@cpdregister.app",
      pub,
      priv
    );
    configured = true;
  }
  return true;
}

/** The key the browser needs in order to subscribe. Public by design. */
export function publicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

/**
 * Send to every device a person has registered.
 *
 * A subscription that comes back 404 or 410 is gone for good — the browser was
 * uninstalled, the permission revoked, the device wiped — so it is deleted
 * rather than retried forever. Any other failure is left alone: a push service
 * having a bad minute is not a reason to stop being able to reach somebody.
 *
 * Returns how many devices actually took it, so a caller can tell the
 * difference between "sent" and "nobody was listening".
 */
export async function pushToUser(userId: number, payload: PushPayload): Promise<number> {
  if (!pushConfigured()) return 0;

  const db = await getDb();
  const subs = (await db
    .prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?")
    .all(userId)) as StoredSubscription[];
  if (subs.length === 0) return 0;

  const body = JSON.stringify(payload);
  let delivered = 0;
  const dead: number[] = [];

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
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(sub.id);
        else console.error("[push] send failed", status ?? error);
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
  return delivered;
}

/** How many devices this person could be reached on. */
export async function deviceCount(userId: number): Promise<number> {
  const db = await getDb();
  const row = (await db
    .prepare("SELECT COUNT(*) AS c FROM push_subscriptions WHERE user_id = ?")
    .get(userId)) as { c: string };
  return Number(row.c);
}
