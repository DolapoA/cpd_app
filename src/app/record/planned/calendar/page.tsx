import Link from "next/link";
import { requireConfirmedUser } from "@/lib/auth";
import { getBaseUrl } from "@/lib/base-url";
import { ensureCalendarToken, regenerateCalendarToken } from "@/lib/actions";
import { CopyField } from "@/components/copy-field";

export const metadata = { title: "Your calendar — CPD Register" };

/**
 * Subscribing to the plan from a real calendar.
 *
 * Set up once and never touched again, which is why it no longer sits under
 * the list: a panel holding an address, three sets of instructions and a
 * destructive button is a settings screen, and it was pushing the thing people
 * actually came to read off the bottom of a phone.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ feed?: string }>;
}) {
  const user = await requireConfirmedUser();
  const { feed } = await searchParams;

  const token = await ensureCalendarToken(user.id);
  const feedUrl = `${await getBaseUrl()}/calendar/${token}/cpd.ics`;
  // webcal: is what makes a click subscribe rather than download a dead copy.
  const subscribeUrl = feedUrl.replace(/^https?:/, "webcal:");

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Your calendar</h1>
          <p>
            Subscribe once and everything on your plan appears in Google Calendar, Apple Calendar
            or Outlook, and keeps itself up to date when you change a date.
          </p>
        </div>
      </div>

      {feed === "new" && (
        <div className="notice notice--ok">
          <p className="small">
            <strong>New address created.</strong> The old one has stopped working — re-subscribe
            anywhere you were using it.
          </p>
        </div>
      )}

      <div className="card">
        <h2>Subscribe</h2>
        <p className="muted small">
          It is read-only: nothing you do in your calendar comes back here. Each event carries a
          reminder a day ahead, which Apple honours and Google ignores — so we email you the
          morning before as well.
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
      </div>

      <div className="card">
        <h2>Replace the address</h2>
        <p className="muted small">
          Treat it like a password: anyone who has it can see what you have planned. It carries no
          other detail about your account, and replacing it stops the old one working immediately.
        </p>
        <form action={regenerateCalendarToken}>
          <button type="submit" className="btn btn--quiet btn--small">
            Replace this address
          </button>
        </form>
      </div>

      <p className="muted small">
        <Link href="/record/planned">← Back to your plan</Link>
      </p>
    </main>
  );
}
