import Link from "next/link";
import { requireConfirmedUser } from "@/lib/auth";
import { getDb, type PdpGoal } from "@/lib/db";
import { daysUntil, goalUrgency } from "@/lib/goal";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Development plan — CPD Register" };

type GoalRow = PdpGoal & { entry_count: string; plan_count: string };

/** The badge for a target date: quiet until it isn't. */
function DueBadge({ target }: { target: string | null }) {
  const days = daysUntil(target);
  const urgency = goalUrgency(days);
  if (days === null) return null;
  if (urgency === "overdue")
    return <span className="badge badge--closed">{Math.abs(days)} days overdue</span>;
  if (urgency === "urgent")
    return <span className="badge badge--pending">{days === 0 ? "due today" : `${days} days left`}</span>;
  if (urgency === "soon") return <span className="badge badge--neutral">{days} days left</span>;
  return <span className="badge badge--neutral">{formatDate(target!)}</span>;
}

const OUTCOME_LABELS: Record<string, string> = {
  achieved: "Achieved",
  carried: "Carried forward",
  dropped: "No longer relevant",
};

/**
 * The personal development plan: what you're working on, and when it's due.
 *
 * A flat list of goals rather than annual documents — the year is a date
 * range, and the appraisal pack already slices by date range. Reviewed goals
 * keep their verdict and reflection and fold away underneath: history is for
 * the appraisal, not the everyday glance.
 */
export default async function DevelopmentPlanPage() {
  const user = await requireConfirmedUser();
  const db = await getDb();

  const goals = (await db
    .prepare(
      `SELECT g.*,
              (SELECT COUNT(*) FROM cpd_entries e WHERE e.pdp_goal_id = g.id) AS entry_count,
              (SELECT COUNT(*) FROM planned_events p WHERE p.pdp_goal_id = g.id AND p.outcome IS NULL) AS plan_count
         FROM pdp_goals g
        WHERE g.user_id = ?
        ORDER BY g.target_date ASC NULLS LAST, g.id ASC`
    )
    .all(user.id)) as GoalRow[];

  const active = goals.filter((g) => g.status === "active");
  const reviewed = goals
    .filter((g) => g.status !== "active")
    .sort((a, b) => (b.closed_on ?? "").localeCompare(a.closed_on ?? ""));

  return (
    <main className="container stack">
      <div className="page-head">
        <div>
          <h1>Development plan</h1>
          <p>What you&rsquo;re working on, and when it&rsquo;s due.</p>
        </div>
        <div className="actions-row">
          <Link href="/record/development/new" className="btn">
            Add a goal
          </Link>
        </div>
      </div>

      {active.length === 0 ? (
        <div className="card">
          <h2>No goals yet</h2>
          <p className="muted">
            A goal is a development need, what you&rsquo;ll do about it, and how you&rsquo;ll
            show it worked. Appraisal expects progress on each one every year.
          </p>
          <p className="small muted">
            The gaps in a finished <Link href="/record/colleague-feedback">MSF round</Link> are
            the natural place to start.
          </p>
        </div>
      ) : (
        <div className="stack">
          {active.map((goal) => {
            const evidence = Number(goal.entry_count);
            const planned = Number(goal.plan_count);
            return (
              <Link
                key={goal.id}
                href={`/record/development/${goal.id}/edit`}
                className="card goal-card"
              >
                <div className="goal-card__head">
                  <span className="goal-card__title">{goal.title}</span>
                  <DueBadge target={goal.target_date} />
                </div>
                <span className="muted small">
                  {[
                    goal.identified_from ? `From ${goal.identified_from}` : null,
                    evidence === 0
                      ? "no evidence yet"
                      : `${evidence} ${evidence === 1 ? "entry" : "entries"} recorded`,
                    planned > 0 ? `${planned} planned` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {reviewed.length > 0 && (
        <details className="card">
          <summary>Reviewed goals ({reviewed.length})</summary>
          <ul className="goal-list stack">
            {reviewed.map((goal) => (
              <li key={goal.id} className="goal-history">
                <div className="goal-card__head">
                  <span>{goal.title}</span>
                  <span className={`badge ${goal.status === "achieved" ? "badge--verified" : "badge--neutral"}`}>
                    {OUTCOME_LABELS[goal.status] ?? goal.status}
                  </span>
                </div>
                <span className="muted small">
                  {goal.closed_on ? formatDate(goal.closed_on) : ""}
                  {goal.outcome_reflection ? ` — ${goal.outcome_reflection}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="muted small">
        <Link href="/record">← Back to my record</Link>
      </p>
    </main>
  );
}
