import Link from "next/link";
import { requireConfirmedUser } from "@/lib/auth";
import { publicKey } from "@/lib/push";
import { deviceCount } from "@/lib/push";
import { PushToggle } from "@/components/push-toggle";
import { sendTestNotification, updateNotificationSettings } from "@/lib/actions";

export const metadata = { title: "Notifications — CPD Register" };

/** 07:00 rather than 7:00, and 8am rather than 08:00 — read aloud, not parsed. */
function hourLabel(h: number): string {
  if (h === 0) return "midnight";
  if (h === 12) return "midday";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; test?: string }>;
}) {
  const user = await requireConfirmedUser();
  const { saved, test } = await searchParams;
  const devices = await deviceCount(user.id);

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Notifications</h1>
          <p>
            Reminders on your phone, for people who have installed the app.{" "}
            <Link href="/account">Back to your account</Link>
          </p>
        </div>
      </div>

      {saved === "1" && (
        <div className="notice notice--ok">
          <p className="small">Saved.</p>
        </div>
      )}
      {test === "sent" && (
        <div className="notice notice--ok">
          <p className="small">Sent — it should appear on your device in a moment.</p>
        </div>
      )}
      {test === "none" && (
        <div className="notice notice--warn">
          <p className="small">
            Nothing was sent, because no device is set up to receive them yet.
          </p>
        </div>
      )}

      <div className="card stack">
        <h2>This device</h2>
        <PushToggle publicKey={publicKey()} devices={devices} />
      </div>

      <form action={updateNotificationSettings} className="card stack">
        <h2>What to send</h2>

        <div>
          <label className="choice" htmlFor="notify_events">
            <input
              id="notify_events"
              name="notify_events"
              type="checkbox"
              defaultChecked={!!user.notify_events}
            />{" "}
            Something on my plan is happening today
          </label>
          <div className="hint">
            One notification on the morning of the event. This is separate from the email you
            already get the day before, which carries on either way.
          </div>
        </div>

        <div>
          <label className="choice" htmlFor="notify_target">
            <input
              id="notify_target"
              name="notify_target"
              type="checkbox"
              defaultChecked={!!user.notify_target}
            />{" "}
            How I&rsquo;m doing against my annual target
          </label>
          <div className="hint">
            Once a month, and only when there is something to say &mdash; how far short you are, or
            that you have got there. Nothing at all if you have no target set.
          </div>
        </div>

        <div>
          <label className="choice" htmlFor="notify_shared">
            <input
              id="notify_shared"
              name="notify_shared"
              type="checkbox"
              defaultChecked={!!user.notify_shared}
            />{" "}
            An event two or more {user.profession ? "colleagues" : "people in my profession"} are
            going to
          </label>
          <div className="hint">
            Told once per event, and only for events people have chosen to share publicly. You
            never see who is going, and they never see that you were told.
          </div>
        </div>

        <div className="field">
          <label htmlFor="notify_hour">Send them at</label>
          <select id="notify_hour" name="notify_hour" defaultValue={String(user.notify_hour)}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {hourLabel(h)}
              </option>
            ))}
          </select>
          <div className="hint">
            UK time, and the same time for all three &mdash; one moment in the day when the app is
            allowed to interrupt you, rather than three.
          </div>
        </div>

        <div className="actions-row">
          <button type="submit" className="btn">
            Save
          </button>
        </div>
      </form>

      {devices > 0 && (
        <form action={sendTestNotification} className="card stack">
          <h2>Check it works</h2>
          <p className="small">
            Sends one to your {devices === 1 ? "device" : `${devices} devices`} now. Worth doing
            once, rather than finding out at {hourLabel(user.notify_hour)} tomorrow that the
            permission never took.
          </p>
          <div className="actions-row">
            <button type="submit" className="btn btn--secondary">
              Send a test notification
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
