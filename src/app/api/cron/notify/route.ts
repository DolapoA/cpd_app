import { NextResponse } from "next/server";
import { getDb, type CpdEntry, type PlannedEvent, type User } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { countsTowardCpd } from "@/lib/registration";
import { pushConfigured, pushToUser } from "@/lib/push";
import { discoverEvents } from "@/lib/actions";

/**
 * Push notifications, run every hour.
 *
 * Hourly rather than daily because the time of day is the person's to choose,
 * and a job that runs once cannot honour twenty-four different answers. Each
 * run asks a single question — whose hour is it right now, in the UK — and
 * does nothing at all for the other twenty-three.
 *
 * Safe to run twice, which matters more here than for the email reminder: a
 * retry, an overlapping run or a clock that ticks over mid-request must not
 * mean two notifications about the same thing. Everything sent is stamped, and
 * every stamp is written only after the send has been attempted.
 *
 * Nothing in here throws upward. One person's notification failing is not a
 * reason for the rest of the hour to go unsent.
 */
export const dynamic = "force-dynamic";

/** The UK's own idea of the date and hour, which is what the person means. */
function ukNow(): { date: string; hour: number; month: string } {
  const uk = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  const date = `${uk.getFullYear()}-${String(uk.getMonth() + 1).padStart(2, "0")}-${String(uk.getDate()).padStart(2, "0")}`;
  return { date, hour: uk.getHours(), month: date.slice(0, 7) };
}

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Without a secret configured the route refuses everyone rather than
  // becoming an endpoint that notifies people on demand.
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** "Cardiology study day, 09:00" — enough to know whether to leave now. */
function eventLine(plan: PlannedEvent): string {
  const parts = [plan.title];
  if (plan.start_time) parts.push(plan.start_time);
  if (plan.location) parts.push(plan.location);
  return parts.join(" · ");
}

export async function GET(request: Request) {
  if (!authorised(request)) return new NextResponse("Not found", { status: 404 });
  if (!pushConfigured()) {
    return NextResponse.json({ skipped: "VAPID keys are not configured" }, { status: 200 });
  }

  const { date, hour, month } = ukNow();
  const db = await getDb();

  // Only people who have both chosen this hour and got a device registered.
  // The join means somebody who has never granted permission costs nothing.
  const users = (await db
    .prepare(
      `SELECT u.* FROM users u
        WHERE u.notify_hour = ?
          AND u.email_verified_at IS NOT NULL
          AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = u.id)`
    )
    .all(hour)) as User[];

  const counts = { people: users.length, events: 0, targets: 0, shared: 0, failed: 0 };

  for (const user of users) {
    try {
      if (user.notify_events) counts.events += await notifyTodaysEvents(user, date);
      if (user.notify_target) counts.targets += await notifyTarget(user, month);
      if (user.notify_shared) counts.shared += await notifyShared(user);
    } catch (error) {
      console.error("[cron/notify] failed for one person", error);
      counts.failed += 1;
    }
  }

  return NextResponse.json({ date, hour, ...counts });
}

/**
 * What is happening today.
 *
 * One notification however many things are on, for the same reason the email
 * groups them: three separate buzzes about the same morning is how a useful
 * reminder becomes something people switch off.
 */
async function notifyTodaysEvents(user: User, date: string): Promise<number> {
  const db = await getDb();
  const plans = (await db
    .prepare(
      `SELECT * FROM planned_events
        WHERE user_id = ? AND starts_on = ? AND outcome IS NULL AND notified_at IS NULL
        ORDER BY start_time NULLS FIRST, title`
    )
    .all(user.id, date)) as PlannedEvent[];
  if (plans.length === 0) return 0;

  const delivered = await pushToUser(user.id, {
    title: plans.length === 1 ? "Today: " + plans[0].title : `${plans.length} things today`,
    body: plans.length === 1 ? eventLine(plans[0]) : plans.map(eventLine).join("\n"),
    url: "/record/planned",
    // Dated, so today's cannot replace tomorrow's on a device left switched off.
    tag: `cpd-day-${date}`,
  });

  // Stamped whether or not a device took it: the alternative is trying again
  // every hour for the rest of the day at somebody whose phone is in a drawer.
  await db
    .prepare("UPDATE planned_events SET notified_at = ? WHERE id = ANY(?)")
    .run(new Date().toISOString(), plans.map((p) => p.id));
  return delivered > 0 ? 1 : 0;
}

/**
 * How the year is going.
 *
 * Monthly at most, and silent unless there is something worth saying. Someone
 * with no target set has said the number does not apply to them — several
 * regulators set none — so they hear nothing rather than being told they are
 * 0% of the way to nothing.
 */
async function notifyTarget(user: User, month: string): Promise<number> {
  const target = user.annual_target_points;
  if (!target || target <= 0) return 0;
  if (user.notified_target_month === month) return 0;

  const db = await getDb();
  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const entries = (await db
    .prepare("SELECT * FROM cpd_entries WHERE user_id = ? AND activity_date >= ?")
    .all(user.id, yearAgo)) as CpdEntry[];

  const points = entries
    .filter((e) => countsTowardCpd(e.activity_date, user.registration_date))
    .reduce((sum, e) => sum + (e.points ?? 0), 0);

  const short = Math.round((target - points) * 10) / 10;
  const payload =
    short <= 0
      ? {
          title: "You have reached your target",
          body: `${points} of ${target} points in the last twelve months. Nothing more is needed.`,
          url: "/dashboard",
          tag: `cpd-target-${month}`,
        }
      : {
          title: `${short} points to go`,
          body: `${points} of ${target} in the last twelve months.`,
          url: "/dashboard",
          tag: `cpd-target-${month}`,
        };

  const delivered = await pushToUser(user.id, payload);
  await db
    .prepare("UPDATE users SET notified_target_month = ? WHERE id = ?")
    .run(month, user.id);
  return delivered > 0 ? 1 : 0;
}

/**
 * What colleagues are going to.
 *
 * Two is the threshold because one person planning something is a personal
 * choice and two is a signal — and because at one, an event shared by a single
 * colleague would effectively announce who shared it.
 *
 * Told once per event, ever. Somebody who ignores it has answered.
 */
async function notifyShared(user: User): Promise<number> {
  if (!user.discover_events || !user.profession) return 0;

  const db = await getDb();
  const events = (await discoverEvents(user)).filter((e) => e.interested >= 2 && !e.mine);
  if (events.length === 0) return 0;

  const told = (await db
    .prepare("SELECT event_key FROM notified_events WHERE user_id = ?")
    .all(user.id)) as { event_key: string }[];
  const seen = new Set(told.map((t) => t.event_key));

  const fresh = events.filter((e) => !seen.has(e.key));
  if (fresh.length === 0) return 0;

  // The soonest one is the one still worth acting on; the rest are recorded as
  // told anyway, so this never becomes a queue that drips out over days.
  const next = fresh[0];
  const delivered = await pushToUser(user.id, {
    title: `${next.interested} colleagues are going to this`,
    body: `${next.title} · ${formatDate(next.starts_on)}`,
    url: "/record/discover",
    tag: `cpd-shared-${next.key}`,
  });

  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO notified_events (user_id, event_key, notified_at)
       SELECT ?, k, ? FROM unnest(?::text[]) AS k
       ON CONFLICT (user_id, event_key) DO NOTHING`
    )
    .run(user.id, now, fresh.map((e) => e.key));

  return delivered > 0 ? 1 : 0;
}
