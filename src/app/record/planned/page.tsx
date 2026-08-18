import Link from "next/link";
import { requireConfirmedUser } from "@/lib/auth";
import { getDb, type PlannedEvent } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { googleCalendarUrl } from "@/lib/planned";
import {
  deletePlannedEvent,
  dismissPlannedEvent,
  recordPlannedEvent,
} from "@/lib/actions";

export const metadata = { title: "Planned CPD — CPD Register" };

/** Anything on or after today is still ahead; a day-long event counts all day. */
function isAhead(plan: PlannedEvent, today: string): boolean {
  return (plan.ends_on ?? plan.starts_on) >= today;
}

/** "6 pts · 7 h", or nothing at all if neither was given. */
function figures(plan: PlannedEvent): string {
  return [
    plan.expected_points != null ? `${plan.expected_points} pts` : null,
    plan.expected_hours != null ? `${plan.expected_hours} h` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function whenText(plan: PlannedEvent): string {
  const days =
    plan.ends_on && plan.ends_on !== plan.starts_on
      ? `${formatDate(plan.starts_on)} – ${formatDate(plan.ends_on)}`
      : formatDate(plan.starts_on);
  if (!plan.start_time) return days;
  return `${days}, ${plan.start_time}${plan.end_time ? `–${plan.end_time}` : ""}`;
}

export default async function PlannedPage() {
  const user = await requireConfirmedUser();

  const today = new Date().toISOString().slice(0, 10);

  const plans = (await (await getDb())
    .prepare(
      "SELECT * FROM planned_events WHERE user_id = ? AND outcome IS NULL ORDER BY starts_on"
    )
    .all(user.id)) as PlannedEvent[];

  const ahead = plans.filter((p) => isAhead(p, today));
  const past = plans.filter((p) => !isAhead(p, today));

  return (
    <main className="container stack">
      <div className="page-head">
        <div>
          <h1>Planned CPD</h1>
          <p>
            What you intend to do, kept apart from what you have done. Subscribe once and it
            appears in your own calendar.
          </p>
        </div>
        <div className="actions-row">
          <Link href="/record/planned/new" className="btn">
            Add something
          </Link>
          <Link href="/record/discover" className="btn btn--secondary">
            Public events
          </Link>
        </div>
      </div>

      {past.length > 0 && (
        <div className="notice notice--info">
          <h3 className="notice__title">
            {past.length === 1 ? "This has been and gone" : "These have been and gone"}
          </h3>
          <p className="small">
            Did you go? Say so and it joins your record, filled in from what you planned.
          </p>
          <div className="table-wrap">
            <table className="table table--stack">
              <tbody>
                {past.map((plan) => (
                  <tr key={plan.id}>
                    <td data-label=".">
                      <strong>{plan.title}</strong>
                      <div className="muted small">{whenText(plan)}</div>
                    </td>
                    <td className="col--actions" data-label=".">
                      <div className="actions-row actions-row--table">
                        <form action={recordPlannedEvent}>
                          <input type="hidden" name="id" value={plan.id} />
                          <button type="submit" className="btn btn--small">
                            I attended
                          </button>
                        </form>
                        <form action={dismissPlannedEvent}>
                          <input type="hidden" name="id" value={plan.id} />
                          <button type="submit" className="btn btn--quiet btn--small">
                            I didn&rsquo;t go
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        {/* Subscribing acts on this list, so it belongs beside it rather than
            among the page's actions — it is done once and then never again. */}
        <div className="page-head page-head--tight">
          <h2>Coming up</h2>
          <Link href="/record/planned/calendar" className="btn btn--quiet btn--small">
            Your calendar
          </Link>
        </div>
        {ahead.length === 0 ? (
          <div className="empty">
            <p className="empty__title">Nothing planned yet</p>
            <p className="small">
              Add the conference, course or study day you already know about. It goes straight
              into your own calendar, and when the date passes we&rsquo;ll ask whether to add it
              to your record.
            </p>
            <div className="actions-row">
              <Link href="/record/planned/new" className="btn btn--secondary">
                Add something you&rsquo;re going to
              </Link>
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table table--stack">
              <tbody>
                {ahead.map((plan) => (
                  <tr key={plan.id}>
                    <td className="col--date" data-label="When">{whenText(plan)}</td>
                    <td data-label=".">
                      <strong>
                        {plan.url ? (
                          <a href={plan.url} target="_blank" rel="noopener noreferrer">
                            {plan.title}
                          </a>
                        ) : (
                          plan.title
                        )}
                      </strong>
                      <div className="muted small">
                        {[plan.provider, plan.location].filter(Boolean).join(" · ")}
                      </div>
                      {plan.notes && <div className="small prewrap">{plan.notes}</div>}
                    </td>
                    {/* Stacked on a phone the cell prints its own label, so an
                        empty one would read "Expected:" and stop. No figures,
                        no label. */}
                    <td
                      className="small col--figures"
                      data-label={figures(plan) ? "Expected" : undefined}
                    >
                      {figures(plan)}
                    </td>
                    <td className="col--actions" data-label=".">
                      <div className="actions-row actions-row--table">
                        <Link
                          href={`/record/planned/${plan.id}/edit`}
                          className="btn btn--quiet btn--small"
                        >
                          Edit
                        </Link>
                        <details className="mini-menu">
                          <summary className="btn btn--quiet btn--small">Calendar</summary>
                          <div className="mini-menu__body">
                            <a href={`/record/planned/${plan.id}/ics`} className="btn btn--quiet btn--small">
                              Download .ics
                            </a>
                            <a
                              href={googleCalendarUrl(plan)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn--quiet btn--small"
                            >
                              Add to Google
                            </a>
                          </div>
                        </details>
                        <form action={deletePlannedEvent}>
                          <input type="hidden" name="id" value={plan.id} />
                          <button type="submit" className="btn btn--quiet btn--small">
                            Remove
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </main>
  );
}
