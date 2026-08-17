import Link from "next/link";
import { requireConfirmedUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { pluralProfession } from "@/lib/professions";
import { addSharedEventToPlan, discoverEvents } from "@/lib/actions";

export const metadata = { title: "Events in your profession — CPD Register" };

export default async function DiscoverPage() {
  const user = await requireConfirmedUser();

  const events = user.discover_events ? await discoverEvents(user) : [];
  const peers = user.profession ? pluralProfession(user.profession) : "professionals";

  return (
    <main className="container stack">
      <div className="page-head">
        <div>
          <h1>What other {peers} are going to</h1>
          <p>
            Public events that people in your profession have chosen to share. You see the event,
            never who added it.
          </p>
        </div>
        <div className="actions-row">
          <Link href="/record/planned" className="btn btn--quiet">
            Your plan →
          </Link>
        </div>
      </div>

      {!user.profession ? (
        <div className="notice notice--info">
          <h3 className="notice__title">Tell us your profession first</h3>
          <p className="small">
            This list is grouped by profession, so we need to know yours before it can show you
            anything. <Link href="/profile">Add it to your profile →</Link>
          </p>
        </div>
      ) : !user.discover_events ? (
        <div className="notice notice--info">
          <h3 className="notice__title">You have this turned off</h3>
          <p className="small">
            Turn it back on from <Link href="/profile">your profile</Link> whenever you like. It
            does not affect what you have chosen to share.
          </p>
        </div>
      ) : events.length === 0 ? (
        <div className="card">
          <div className="empty">
            <p className="empty__title">Nothing shared yet</p>
            <p className="small">
              Nobody in your profession has shared an upcoming event. If you know of one, sharing
              it from your own plan is what starts this off — tick{" "}
              <strong>anyone can attend</strong> and then <strong>let others see it</strong>.
            </p>
            <div className="actions-row">
              <Link href="/record/planned" className="btn btn--secondary">
                Add something to your plan
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {events.map((event) => (
                  <tr key={event.key}>
                    <td className="col--date">
                      {event.ends_on && event.ends_on !== event.starts_on
                        ? `${formatDate(event.starts_on)} – ${formatDate(event.ends_on)}`
                        : formatDate(event.starts_on)}
                      {event.start_time ? (
                        <div className="muted small">{event.start_time}</div>
                      ) : null}
                    </td>
                    <td>
                      <strong>
                        {event.url ? (
                          <a href={event.url} target="_blank" rel="noopener noreferrer">
                            {event.title}
                          </a>
                        ) : (
                          event.title
                        )}
                      </strong>
                      <div className="muted small">
                        {[event.provider, event.location].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td className="small">
                      {event.interested === 1
                        ? `1 ${user.profession?.toLowerCase() ?? "person"} planning to go`
                        : `${event.interested} ${peers} planning to go`}
                    </td>
                    <td>
                      {event.mine ? (
                        <span className="badge badge--verified">On your plan</span>
                      ) : (
                        <form action={addSharedEventToPlan}>
                          <input type="hidden" name="key" value={event.key} />
                          <button type="submit" className="btn btn--secondary btn--small">
                            Add to my plan
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="hint">
        Counts are of people, not of names — nobody can see who else is going, including us in the
        page you are reading. Something here that shouldn&rsquo;t be?{" "}
        <Link href="/feedback">Tell us</Link>.
      </p>
    </main>
  );
}
