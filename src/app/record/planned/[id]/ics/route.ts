import { getCurrentUser } from "@/lib/auth";
import { getDb, type PlannedEvent } from "@/lib/db";
import { renderCalendar } from "@/lib/ics";
import { plannedToCalendarEvent } from "@/lib/planned";

/** One event, downloaded — for people who would rather not subscribe to anything. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Not found", { status: 404 });

  const { id } = await params;
  const plan = (await (await getDb())
    .prepare("SELECT * FROM planned_events WHERE id = ? AND user_id = ?")
    .get(Number(id), user.id)) as PlannedEvent | undefined;
  if (!plan) return new Response("Not found", { status: 404 });

  const body = renderCalendar([plannedToCalendarEvent(plan)], { name: plan.title });
  const safeName = plan.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60);

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName || "event"}.ics"`,
    },
  });
}
