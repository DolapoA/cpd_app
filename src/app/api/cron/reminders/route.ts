import { NextResponse } from "next/server";
import { getDb, type PlannedEvent } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { sendPlanReminder, type PlanReminder } from "@/lib/email";

/**
 * The day-before reminder, run once a morning by Vercel Cron.
 *
 * It exists because a calendar cannot be relied on to remind anybody: an alarm
 * in a subscribed feed is advisory, and Google ignores alarms in subscribed
 * calendars entirely. Email is the one channel that reaches everyone.
 *
 * Written to be safe to run twice. `reminded_at` is stamped as each person's
 * mail goes out, so a retry, an overlapping run or a second schedule cannot
 * send the same reminder again.
 */
export const dynamic = "force-dynamic";

/** UK date, which is what "tomorrow" means to the person reading it. */
function tomorrowInUk(): string {
  const now = new Date();
  const uk = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
  uk.setDate(uk.getDate() + 1);
  return `${uk.getFullYear()}-${String(uk.getMonth() + 1).padStart(2, "0")}-${String(uk.getDate()).padStart(2, "0")}`;
}

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Without a secret configured the route refuses everyone rather than
  // becoming an open endpoint that emails people on demand.
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorised(request)) return new NextResponse("Not found", { status: 404 });

  const day = tomorrowInUk();
  const db = await getDb();

  const rows = (await db
    .prepare(
      `SELECT p.*, u.email AS user_email, u.full_name AS user_name
         FROM planned_events p
         JOIN users u ON u.id = p.user_id
        WHERE p.starts_on = ?
          AND p.outcome IS NULL
          AND p.reminded_at IS NULL
          AND u.email_verified_at IS NOT NULL
        ORDER BY p.user_id, p.start_time NULLS FIRST, p.title`
    )
    .all(day)) as (PlannedEvent & { user_email: string; user_name: string })[];

  // One email per person, however many things they have on — three separate
  // emails about the same morning is how a useful reminder becomes noise.
  const byUser = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byUser.get(row.user_email) ?? [];
    list.push(row);
    byUser.set(row.user_email, list);
  }

  let sent = 0;
  let failed = 0;
  for (const [email, plans] of byUser) {
    const reminders: PlanReminder[] = plans.map((p) => ({
      title: p.title,
      when: p.start_time
        ? `${formatDate(p.starts_on)}, ${p.start_time}${p.end_time ? `–${p.end_time}` : ""}`
        : formatDate(p.starts_on),
      location: p.location,
      provider: p.provider,
      url: p.url,
    }));

    try {
      await sendPlanReminder(email, plans[0].user_name.split(" ")[0], reminders);
      // Stamped only after the send succeeds, so a failure is retried tomorrow
      // rather than silently swallowed.
      await db
        .prepare(`UPDATE planned_events SET reminded_at = ? WHERE id = ANY(?)`)
        .run(new Date().toISOString(), plans.map((p) => p.id));
      sent += 1;
    } catch (error) {
      console.error("[cron/reminders] failed for one recipient", error);
      failed += 1;
    }
  }

  return NextResponse.json({ day, people: byUser.size, events: rows.length, sent, failed });
}
