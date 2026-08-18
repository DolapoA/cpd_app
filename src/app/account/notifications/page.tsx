import Link from "next/link";
import { requireConfirmedUser } from "@/lib/auth";
import { publicKey } from "@/lib/push";
import { deviceCount } from "@/lib/push";
import { InfoHint } from "@/components/info-hint";
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
  searchParams: Promise<{ saved?: string; test?: string; status?: string; why?: string }>;
}) {
  const user = await requireConfirmedUser();
  const { saved, test, status, why } = await searchParams;
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
      {test === "no-devices" && (
        <div className="notice notice--warn">
          <p className="small">
            Nothing was sent, because no device is set up to receive them yet.
          </p>
        </div>
      )}
      {test === "not-configured" && (
        <div className="notice notice--warn">
          <h3 className="notice__title">The server cannot sign notifications</h3>
          <p className="small">
            Your device is set up correctly &mdash; this end is not.{" "}
            {why ? <strong>{why}</strong> : "The signing keys are missing."} Setting it in the
            deployment and redeploying is all that is missing.
          </p>
        </div>
      )}
      {test === "rejected" && (
        <div className="notice notice--warn">
          <h3 className="notice__title">The push service refused it</h3>
          <p className="small">
            Your device is registered, but{" "}
            {status === "403"
              ? "the signing key does not match the one this device subscribed with. Turning notifications off and on again on this device re-subscribes it against the current key."
              : status === "401"
                ? "the signing key was rejected. Check VAPID_SUBJECT is a mailto: or https: address."
                : "the delivery attempt failed."}{" "}
            {status && <>The service answered {status}.</>}
          </p>
        </div>
      )}
      {test === "none" && (
        <div className="notice notice--warn">
          <p className="small">Nothing was sent.</p>
        </div>
      )}

      <div className="card stack">
        <h2>This device</h2>
        <PushToggle publicKey={publicKey()} devices={devices} />
      </div>

      <form action={updateNotificationSettings} className="card stack">
        <h2>What to send</h2>

        {/* The explanation of each one is longer than the choice itself, and
            three of them stacked pushed the hour and the save button off the
            screen entirely. Folded away, the list reads as a list. */}
        <div>
          <label className="choice" htmlFor="notify_events">
            <input
              id="notify_events"
              name="notify_events"
              type="checkbox"
              defaultChecked={!!user.notify_events}
            />{" "}
            Happening today
            <InfoHint label="What is sent, and when">
              One notification on the morning of anything on your plan. This is separate from the
              email you already get the day before, which carries on either way.
            </InfoHint>
          </label>
        </div>

        <div>
          <label className="choice" htmlFor="notify_target">
            <input
              id="notify_target"
              name="notify_target"
              type="checkbox"
              defaultChecked={!!user.notify_target}
            />{" "}
            Annual Target
            <InfoHint label="How often the target is mentioned">
              Once a month, and only when there is something to say &mdash; how far short you are,
              or that you have got there. Nothing at all if you have no target set.
            </InfoHint>
          </label>
        </div>

        <div>
          <label className="choice" htmlFor="notify_shared">
            <input
              id="notify_shared"
              name="notify_shared"
              type="checkbox"
              defaultChecked={!!user.notify_shared}
            />{" "}
            CPD Events
            <InfoHint label="Which events, and what others can see">
              An event two or more{" "}
              {user.profession ? "colleagues" : "people in your profession"} have said they are
              going to. Told once per event, and only for events people have chosen to share
              publicly. You never see who is going, and they never see that you were told.
            </InfoHint>
          </label>
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
          <h2>Notification Check</h2>
          <p className="small">
            Sends one to your {devices === 1 ? "device" : `${devices} devices`} now.
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
