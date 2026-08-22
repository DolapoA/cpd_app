import { EVENT_TYPES } from "@/lib/format";
import type { Register } from "@/lib/db";
import { parseJsonArray } from "@/lib/entitlements";

/**
 * The fields of an attendance register, shared by creating one and editing it.
 *
 * One copy so the two forms cannot drift: a rule enforced on creation but not
 * on an edit is a rule that lasts until somebody edits.
 *
 * The join code is deliberately absent. It is printed on QR codes and read out
 * in rooms, so it is the one thing about a register that must not change —
 * editing the event is not the same as replacing it.
 */

/** How long after the end the register shut, from the two timestamps we hold. */
function closeAfterHours(register?: Register): string {
  if (!register) return "24";
  const ends = new Date(`${register.event_date}T${register.end_time}`).getTime();
  const closes = new Date(register.closes_at).getTime();
  if (isNaN(ends) || isNaN(closes)) return "24";
  const hours = Math.round((closes - ends) / 3600000);
  // Anything not on the list was set before the list was, so the nearest
  // sensible default is better than inventing an option nobody chose.
  return ["1", "6", "24", "72"].includes(String(hours)) ? String(hours) : "24";
}

export function RegisterFields({
  defaultOrganiser,
  register,
  organiserPlan = false,
}: {
  defaultOrganiser: string;
  register?: Register;
  /** Renders the paid extras. The action ignores them from anyone else. */
  organiserPlan?: boolean;
}) {
  const official = register ? !!register.is_official : false;
  const customFields = parseJsonArray<string>(register?.custom_fields);

  return (
    <>
      <div className="field">
        <label htmlFor="title">Event title</label>
        <input id="title" name="title" type="text" required defaultValue={register?.title ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={2} defaultValue={register?.description ?? ""} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="event_date">Date</label>
          <input id="event_date" name="event_date" type="date" required defaultValue={register?.event_date ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="start_time">Starts</label>
          <input id="start_time" name="start_time" type="time" required defaultValue={register?.start_time ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="end_time">Ends</label>
          <input id="end_time" name="end_time" type="time" required defaultValue={register?.end_time ?? ""} />
        </div>
      </div>
      {/* The clock these times are read in, said rather than assumed. The
          register opens and closes on them, so an organiser abroad typing
          their own local time would stand in a room with a register that is
          not open yet and no explanation — the settings page already names
          UK time for notifications, and this form gates more than that. */}
      <div className="hint">UK time. The register opens and closes on the UK clock.</div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="location">Location</label>
          <input
            id="location"
            name="location"
            type="text"
            placeholder="Venue, or &ldquo;Online&rdquo;"
            defaultValue={register?.location ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="event_type">Event type</label>
          <select id="event_type" name="event_type" required defaultValue={register?.event_type ?? ""}>
            <option value="" disabled>
              Choose&hellip;
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
          defaultValue={register?.organiser_name ?? defaultOrganiser}
        />
        {/* The fallback surprised a tester who cleared the box and found their
            name back in it. It is the right behaviour — a register with no
            organiser named on it is worthless as evidence — but behaviour
            nobody was told about reads as a bug. */}
        <div className="hint">Left blank, your own name is used.</div>
      </div>

      <hr className="divider" />

      <div className="field">
        <label>CPD status</label>
        <div className="field-row">
          <label className="choice">
            <input type="radio" name="is_official" value="official" defaultChecked={official} />{" "}
            Official (accredited)
          </label>
          <label className="choice">
            <input type="radio" name="is_official" value="unofficial" defaultChecked={!official} />{" "}
            Unofficial
          </label>
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
            defaultValue={register?.accrediting_body ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="points">CPD points / credits</label>
          <input
            id="points"
            name="points"
            type="number"
            min={0}
            step="0.5"
            defaultValue={register?.points ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="hours">Learning hours</label>
          <input
            id="hours"
            name="hours"
            type="number"
            min={0}
            step="0.25"
            defaultValue={register?.hours ?? ""}
          />
        </div>
      </div>

      <hr className="divider" />

      <div className="field-row">
        <div className="field">
          <label htmlFor="close_after_hours">Close register how long after the event ends?</label>
          <select id="close_after_hours" name="close_after_hours" defaultValue={closeAfterHours(register)}>
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
            defaultValue={register?.access_code ?? ""}
          />
          <div className="hint">Announce it in the room to stop remote sign-ins.</div>
        </div>
      </div>

      <hr className="divider" />

      <div className="field">
        <label className="choice">
          <input
            type="checkbox"
            name="collect_feedback"
            value="yes"
            defaultChecked={register ? !!register.feedback_enabled : true}
          />{" "}
          Ask attendees for feedback after they sign
        </label>
      </div>

      {organiserPlan && (
        <>
          <div className="field">
            <label htmlFor="feedback_min_responses">Show feedback only after</label>
            <select
              id="feedback_min_responses"
              name="feedback_min_responses"
              defaultValue={String(register?.feedback_min_responses ?? 0)}
            >
              <option value="0">Show replies as they arrive</option>
              <option value="3">3 replies</option>
              <option value="5">5 replies</option>
              <option value="10">10 replies</option>
            </select>
            <div className="hint">
              A threshold keeps early replies from being identifiable in a small room.
            </div>
          </div>

          <hr className="divider" />

          <div className="field">
            <label>Extra sign-in questions</label>
            <div className="hint">
              Up to three, asked of everyone who signs. Answers appear beside each signature and
              in the export.
            </div>
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                name={`custom_field_${i}`}
                type="text"
                maxLength={80}
                defaultValue={customFields[i] ?? ""}
                placeholder={i === 0 ? "e.g. Ward or department" : "Leave blank for none"}
                aria-label={`Extra question ${i + 1}`}
                style={{ marginBottom: "var(--space-2)" }}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
