import { getDb, type PlannedEvent, type User } from "@/lib/db";
import { renderCalendar, type CalendarEvent } from "@/lib/ics";
import { plannedToCalendarEvent } from "@/lib/planned";

/**
 * The subscription feed.
 *
 * A calendar app cannot send a cookie or a header, so the token in the URL is
 * the whole credential. That shapes what may appear here: event details the
 * user typed themselves, and nothing else — no email address, no verification
 * code, nothing that would turn a leaked calendar URL into a leak of anything
 * but somebody's conference plans.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = await getDb();
  const user = (await db
    .prepare("SELECT id, full_name FROM users WHERE calendar_token = ?")
    .get(token)) as Pick<User, "id" | "full_name"> | undefined;

  // Same answer for a wrong token as for a revoked one, and no hint that some
  // other token would have worked.
  if (!user) return new Response("Not found", { status: 404 });

  const plans = (await db
    .prepare(
      "SELECT * FROM planned_events WHERE user_id = ? AND outcome IS NULL ORDER BY starts_on"
    )
    .all(user.id)) as PlannedEvent[];

  const body = renderCalendar(plans.map(plannedToCalendarEvent) as CalendarEvent[], {
    name: "CPD plans",
    description: "Events you have planned on CPD Register.",
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="cpd.ics"',
      // Subscribed calendars poll this. Caching a stale copy is the one thing
      // that would make the feed feel broken.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
