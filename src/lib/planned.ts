import type { PlannedEvent } from "./db";
import type { CalendarEvent } from "./ics";

/** The host part of a UID. Stable so a re-subscribed feed updates, not duplicates. */
const UID_HOST = "cpdregister.app";

export function plannedToCalendarEvent(plan: PlannedEvent): CalendarEvent {
  const description = [
    plan.provider ? `Provider: ${plan.provider}` : null,
    plan.expected_points != null ? `Expected CPD points: ${plan.expected_points}` : null,
    plan.expected_hours != null ? `Expected hours: ${plan.expected_hours}` : null,
    plan.notes,
    "Planned on CPD Register.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    uid: `planned-${plan.id}@${UID_HOST}`,
    title: plan.title,
    startsOn: plan.starts_on,
    endsOn: plan.ends_on,
    startTime: plan.start_time,
    endTime: plan.end_time,
    location: plan.location,
    description,
    url: plan.url,
    sequence: plan.revision,
    updatedAt: plan.updated_at,
  };
}

/** A "add this to Google Calendar" link, for people who live in one tab. */
export function googleCalendarUrl(plan: PlannedEvent): string {
  const compact = (ymd: string) => ymd.replace(/-/g, "");
  const dayAfter = (ymd: string) => {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return compact(d.toISOString().slice(0, 10));
  };

  let dates: string;
  if (plan.start_time) {
    // Google reads a bare local time when a time zone is given alongside it.
    const t = (hm: string) => `${hm.replace(":", "")}00`;
    const end = plan.end_time ?? plan.start_time;
    dates = `${compact(plan.starts_on)}T${t(plan.start_time)}/${compact(plan.ends_on ?? plan.starts_on)}T${t(end)}`;
  } else {
    dates = `${compact(plan.starts_on)}/${dayAfter(plan.ends_on ?? plan.starts_on)}`;
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: plan.title,
    dates,
    ctz: "Europe/London",
  });
  if (plan.location) params.set("location", plan.location);
  if (plan.provider || plan.notes)
    params.set("details", [plan.provider, plan.notes].filter(Boolean).join("\n"));

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
