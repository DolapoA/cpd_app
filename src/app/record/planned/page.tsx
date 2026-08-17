import Link from "next/link";
import { requireConfirmedUser } from "@/lib/auth";
import { getDb, type PlannedEvent } from "@/lib/db";
import { getBaseUrl } from "@/lib/base-url";
import { formatDate } from "@/lib/format";
import { googleCalendarUrl } from "@/lib/planned";
import {
  addPlannedEvent,
  deletePlannedEvent,
  dismissPlannedEvent,
  ensureCalendarToken,
  recordPlannedEvent,
  regenerateCalendarToken,
} from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { CopyField } from "@/components/copy-field";
import { PlannedFields } from "@/components/planned-fields";

export const metadata = { title: "Planned CPD — CPD Register" };

/** Anything on or after today is still ahead; a day-long event counts all day. */
function isAhead(plan: PlannedEvent, today: string): boolean {
  return (plan.ends_on ?? plan.starts_on) >= today;
}

function whenText(plan: PlannedEvent): string {
  const days =
    plan.ends_on && plan.ends_on !== plan.starts_on
      ? `${formatDate(plan.starts_on)} – ${formatDate(plan.ends_on)}`
      : formatDate(plan.starts_on);
  if (!plan.start_time) return days;
  return `${days}, ${plan.start_time}${plan.end_time ? `–${plan.end_time}` : ""}`;
}

export default async function PlannedPage({
  searchParams,
}: {
  searchParams: Promise<{ feed?: string }>;
}) {
  const user = await requireConfirmedUser();

  const { feed } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  const plans = (await (await getDb())
    .prepare(
      "SELECT * FROM planned_events WHERE user_id = ? AND outcome IS NULL ORDER BY starts_on"
    )
    .all(user.id)) as PlannedEvent[];

  const ahead = plans.filter((p) => isAhead(p, today));
  const past = plans.filter((p) => !isAhead(p, today));

  const token = await ensureCalendarToken(user.id);
  const feedUrl = `${await getBaseUrl()}/calendar/${token}/cpd.ics`;
  // webcal: is what makes a click subscribe rather than download a dead copy.
  const subscribeUrl = feedUrl.replace(/^https?:/, "webcal:");

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
          <Link href="/record/discover" className="btn btn--secondary">
            What others are going to
          </Link>
          <Link href="/record" className="btn btn--quiet">
            Your record →
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
            <table className="table">
              <tbody>
                {past.map((plan) => (
                  <tr key={plan.id}>
                    <td>
                      <strong>{plan.title}</strong>
                      <div className="muted small">{whenText(plan)}</div>
                    </td>
                    <td className="col--actions">
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
        <div className="page-head">
          <h2>Coming up</h2>
        </div>
        {ahead.length === 0 ? (
          <div className="empty">
            <p className="empty__title">Nothing planned yet</p>
            <p className="small">
              Add the conference, course or study day you already know about. It goes straight
              into your own calendar, and when the date passes we&rsquo;ll ask whether to add it
              to your record.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {ahead.map((plan) => (
                  <tr key={plan.id}>
                    <td className="col--date">{whenText(plan)}</td>
                    <td>
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
                    <td className="small col--figures">
                      {plan.expected_points != null ? `${plan.expected_points} pts` : ""}
                      {plan.expected_points != null && plan.expected_hours != null ? " · " : ""}
                      {plan.expected_hours != null ? `${plan.expected_hours} h` : ""}
                    </td>
                    <td className="col--actions">
                      <div className="actions-row actions-row--table">
                        <Link
                          href={`/record/planned/${plan.id}/edit`}
                          className="btn btn--quiet btn--small"
                        >
                          Edit
                        </Link>
                        <a href={`/record/planned/${plan.id}/ics`} className="btn btn--quiet btn--small">
                          .ics
                        </a>
                        <a
                          href={googleCalendarUrl(plan)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn--quiet btn--small"
                        >
                          Google
                        </a>
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

      <div className="card">
        <h2>Add something you&rsquo;re going to</h2>
        <ActionForm action={addPlannedEvent} submitLabel="Add to my plan">
          <PlannedFields />
        </ActionForm>
      </div>

      <div className="card">
        <h2>Your calendar</h2>
        {feed === "new" && (
          <div className="notice notice--ok">
            <p className="small">
              <strong>New address created.</strong> The old one has stopped working — re-subscribe
              anywhere you were using it.
            </p>
          </div>
        )}
        <p className="muted small">
          Subscribe once and everything above appears in Google Calendar, Apple Calendar or
          Outlook, and keeps itself up to date when you change a date. It is read-only: nothing
          you do in your calendar comes back here.
        </p>
        <CopyField label="Your private calendar address" value={feedUrl} />
        <div className="actions-row">
          <a href={subscribeUrl} className="btn btn--secondary">
            Subscribe on this device
          </a>
          <a
            href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--quiet"
          >
            Add to Google Calendar
          </a>
        </div>
        <details>
          <summary className="small">How to add it by hand</summary>
          <ul className="bullets small">
            <li>
              <strong>Google Calendar:</strong> Other calendars → From URL → paste the address.
              Google decides how often to check, which can be several hours — that is Google, not
              your calendar being stale.
            </li>
            <li>
              <strong>Apple (iPhone or Mac):</strong> Calendar → File → New Calendar Subscription,
              or Settings → Calendar → Accounts → Add → Other → Add Subscribed Calendar. You can
              set it to refresh every hour.
            </li>
            <li>
              <strong>Outlook:</strong> Add calendar → Subscribe from web → paste the address.
            </li>
          </ul>
        </details>
        <p className="hint">
          Treat this address like a password: anyone who has it can see what you have planned.
          It carries no other detail about your account, and you can replace it at any time.
        </p>
        <form action={regenerateCalendarToken}>
          <button type="submit" className="btn btn--quiet btn--small">
            Replace this address
          </button>
        </form>
      </div>
    </main>
  );
}
