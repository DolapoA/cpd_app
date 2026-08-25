import { addManualEntry } from "@/lib/actions";
import { requireConfirmedUser } from "@/lib/auth";
import { getDb, type PdpGoal } from "@/lib/db";
import { ACTIVITY_TYPES } from "@/lib/format";
import { frameworkFor } from "@/lib/standards";
import { ActionForm } from "@/components/action-form";
import { StandardsPicker } from "@/components/standards-picker";
import { PdpGoalSelect } from "@/components/pdp-goal-select";

export const metadata = { title: "Log activity — CPD Register" };

export default async function NewEntryPage() {
  const user = await requireConfirmedUser();
  const framework = frameworkFor(user.regulator);
  const goals = (await (await getDb())
    .prepare(
      "SELECT id, title FROM pdp_goals WHERE user_id = ? AND status = 'active' ORDER BY target_date ASC NULLS LAST"
    )
    .all(user.id)) as Pick<PdpGoal, "id" | "title">[];

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Log a CPD activity</h1>
          <p>
            For learning off-platform — reading, e-learning, courses, mentoring. Marked
            self-reported.
          </p>
        </div>
      </div>
      <div className="card">
        <ActionForm action={addManualEntry} submitLabel="Add to my record">
          <div className="field">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. BMJ module: sepsis recognition"
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="activity_date">Date</label>
              <input id="activity_date" name="activity_date" type="date" required />
            </div>
            <div className="field">
              <label htmlFor="activity_type">Activity type</label>
              <select id="activity_type" name="activity_type" required defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
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
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="points">Points / credits</label>
              <input id="points" name="points" type="number" min={0} step="0.5" />
            </div>
            <div className="field">
              <label htmlFor="hours">Hours</label>
              <input id="hours" name="hours" type="number" min={0} step="0.25" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="provider">Provider / organiser</label>
            <input id="provider" name="provider" type="text" />
          </div>
          {framework && <StandardsPicker framework={framework} />}
          <div className="field">
            <label htmlFor="notes">Learning outcomes / reflection</label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="What did you learn, and how will it change your practice?"
            />
            <div className="hint">Appears in your audit pack and appraisal summary.</div>
          </div>
          <PdpGoalSelect goals={goals} />
        </ActionForm>
      </div>
    </main>
  );
}
