import Link from "next/link";
import { notFound } from "next/navigation";
import { requireConfirmedUser } from "@/lib/auth";
import { getDb, type CpdEntry, type PdpGoal, type PlannedEvent } from "@/lib/db";
import { deletePdpGoal, reviewPdpGoal, updatePdpGoal } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { PdpFields } from "@/components/pdp-fields";
import { PdpReviewFields } from "@/components/pdp-review-fields";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Development goal — CPD Register" };

/**
 * One goal: its fields, the evidence gathered towards it, and — the part
 * appraisal cares about — the review. Only active goals reach this page;
 * a reviewed goal is history, and history is read-only.
 */
export default async function EditPdpGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireConfirmedUser();
  const { id } = await params;

  const db = await getDb();
  const goal = (await db
    .prepare("SELECT * FROM pdp_goals WHERE id = ? AND user_id = ? AND status = 'active'")
    .get(Number(id), user.id)) as PdpGoal | undefined;
  if (!goal) notFound();

  const entries = (await db
    .prepare(
      "SELECT * FROM cpd_entries WHERE pdp_goal_id = ? AND user_id = ? ORDER BY activity_date DESC"
    )
    .all(goal.id, user.id)) as CpdEntry[];
  const plans = (await db
    .prepare(
      "SELECT * FROM planned_events WHERE pdp_goal_id = ? AND user_id = ? AND outcome IS NULL ORDER BY starts_on ASC"
    )
    .all(goal.id, user.id)) as PlannedEvent[];

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Edit goal</h1>
          <p>{goal.title}</p>
        </div>
      </div>

      <div className="card">
        <ActionForm action={updatePdpGoal} submitLabel="Save changes">
          <input type="hidden" name="id" value={goal.id} />
          <PdpFields goal={goal} />
        </ActionForm>
      </div>

      {(entries.length > 0 || plans.length > 0) && (
        <div className="card">
          <h2>Evidence</h2>
          <ul className="goal-list stack">
            {entries.map((entry) => (
              <li key={`e${entry.id}`} className="goal-history">
                <span>{entry.title}</span>{" "}
                <span className="muted small">{formatDate(entry.activity_date)} · recorded</span>
              </li>
            ))}
            {plans.map((plan) => (
              <li key={`p${plan.id}`} className="goal-history">
                <span>{plan.title}</span>{" "}
                <span className="muted small">{formatDate(plan.starts_on)} · planned</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2>Review this goal</h2>
        <p className="muted small">
          The verdict your next appraisal will read. Reviewed goals move to history and stop
          being editable.
        </p>
        <ActionForm action={reviewPdpGoal} submitLabel="Record the review">
          <input type="hidden" name="id" value={goal.id} />
          <PdpReviewFields />
        </ActionForm>
      </div>

      <details>
        <summary className="muted small">Delete this goal</summary>
        <form action={deletePdpGoal} className="stack">
          <input type="hidden" name="id" value={goal.id} />
          <p className="muted small">
            Anything recorded towards it stays in your record — it just stops pointing here.
            To close a goal with its story intact, review it instead.
          </p>
          <button type="submit" className="btn btn--danger">
            Delete goal
          </button>
        </form>
      </details>

      <p className="muted small">
        <Link href="/record/development">← Back to your development plan</Link>
      </p>
    </main>
  );
}
