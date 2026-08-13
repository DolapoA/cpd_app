import { redirect } from "next/navigation";
import { createRegister } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { EVENT_TYPES } from "@/lib/format";
import { ActionForm } from "@/components/action-form";

export const metadata = { title: "New register — CPD Register" };

export default async function NewRegisterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Create an attendance register</h1>
          <p>
            It opens at the start time and closes automatically afterwards, so signatures are
            credible evidence.
          </p>
        </div>
      </div>
      <div className="card">
        <ActionForm action={createRegister} submitLabel="Create register">
          <div className="field">
            <label htmlFor="title">Event title</label>
            <input id="title" name="title" type="text" required />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={2} />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="event_date">Date</label>
              <input id="event_date" name="event_date" type="date" required />
            </div>
            <div className="field">
              <label htmlFor="start_time">Starts</label>
              <input id="start_time" name="start_time" type="time" required />
            </div>
            <div className="field">
              <label htmlFor="end_time">Ends</label>
              <input id="end_time" name="end_time" type="time" required />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                name="location"
                type="text"
                placeholder="Venue, or “Online”"
              />
            </div>
            <div className="field">
              <label htmlFor="event_type">Event type</label>
              <select id="event_type" name="event_type" required defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="organiser_name">Organiser name shown to attendees</label>
            <input
              id="organiser_name"
              name="organiser_name"
              type="text"
              defaultValue={user.full_name}
            />
          </div>

          <hr className="divider" />

          <div className="field">
            <label>CPD status</label>
            <div className="field-row">
              <label className="choice">
                <input type="radio" name="is_official" value="official" /> Official (accredited)
              </label>
              <label className="choice">
                <input type="radio" name="is_official" value="unofficial" defaultChecked />{" "}
                Unofficial
              </label>
            </div>
            <div className="hint">
              Official events need the accrediting body and points. Shown on every slip.
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="accrediting_body">Accrediting body</label>
              <input
                id="accrediting_body"
                name="accrediting_body"
                type="text"
                placeholder="e.g. Royal College of Physicians"
              />
            </div>
            <div className="field">
              <label htmlFor="points">CPD points / credits</label>
              <input id="points" name="points" type="number" min={0} step="0.5" />
            </div>
            <div className="field">
              <label htmlFor="hours">Learning hours</label>
              <input id="hours" name="hours" type="number" min={0} step="0.25" />
            </div>
          </div>

          <hr className="divider" />

          <div className="field-row">
            <div className="field">
              <label htmlFor="close_after_hours">Close register how long after the event ends?</label>
              <select id="close_after_hours" name="close_after_hours" defaultValue="24">
                <option value="1">1 hour</option>
                <option value="6">6 hours</option>
                <option value="24">24 hours (recommended)</option>
                <option value="72">3 days</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="access_code">In-room access code (optional)</label>
              <input
                id="access_code"
                name="access_code"
                type="text"
                maxLength={12}
                placeholder="e.g. TEAL42"
              />
              <div className="hint">Announce it in the room to stop remote sign-ins.</div>
            </div>
          </div>

          <hr className="divider" />

          <div className="field">
            <label className="choice">
              <input type="checkbox" name="collect_feedback" value="yes" defaultChecked /> Ask
              attendees for feedback after they sign
            </label>
            <div className="hint">
              Five ratings and an optional comment, asked after sign-in so it never blocks it.
              Answers reach you without names attached.
            </div>
          </div>
        </ActionForm>
      </div>
    </main>
  );
}
