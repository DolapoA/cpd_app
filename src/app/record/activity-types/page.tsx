import Link from "next/link";
import { getDb, type CpdEntry } from "@/lib/db";
import { requireConfirmedUser } from "@/lib/auth";
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_EXAMPLES,
  formatDate,
  HCPC_AUDIT_PACK_REGULATOR,
} from "@/lib/format";
import { clampToRegistration } from "@/lib/registration";
import { TypeGoalForm } from "@/components/type-goal-form";
import { daysUntil } from "@/lib/goal";
import type { ActivityTypeGoal } from "@/lib/db";

export const metadata = { title: "Activity types — CPD Register" };

export default async function ActivityTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await requireConfirmedUser();

  const sp = await searchParams;
  const to = sp.to ?? new Date().toISOString().slice(0, 10);
  // Defaults to the same 12 months as the dashboard stat that links here.
  const requestedFrom =
    sp.from ??
    new Date(new Date(to + "T00:00:00").getTime() - 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  const from = clampToRegistration(requestedFrom, user.registration_date);

  const entries = await (await getDb())
    .prepare(
      `SELECT * FROM cpd_entries
       WHERE user_id = ? AND activity_date >= ? AND activity_date <= ?
       ORDER BY activity_date DESC`
    )
    .all(user.id, from, to) as CpdEntry[];

  const byType = ACTIVITY_TYPES.map((type) => ({
    type,
    activities: entries.filter((e) => e.activity_type === type),
  }));
  const covered = byType.filter((t) => t.activities.length > 0);
  const missing = byType.filter((t) => t.activities.length === 0);
  const isHcpc = user.regulator === HCPC_AUDIT_PACK_REGULATOR;

  const goals = await (await getDb())
    .prepare("SELECT * FROM activity_type_goals WHERE user_id = ?")
    .all(user.id) as ActivityTypeGoal[];
  const goalFor = (type: string) => goals.find((g) => g.activity_type === type)?.target_date ?? null;

  return (
    <main className="container stack">
      <div className="page-head">
        <div>
          <h1>Activity types</h1>
          <p>
            {covered.length} of {ACTIVITY_TYPES.length} covered between {formatDate(from)} and{" "}
            {formatDate(to)}.
          </p>
        </div>
        <div className="actions-row">
          <Link href="/record/new" className="btn">
            Log activity
          </Link>
          <Link href="/dashboard" className="btn btn--secondary">
            Back to dashboard
          </Link>
        </div>
      </div>

      <div className="card">
        <p className="small">
          {isHcpc ? (
            <>
              <strong>HCPC expects a mix.</strong> Its guidance says CPD activities
              &ldquo;must include a mixture of different types of learning, so you&rsquo;ll need to
              carry out at least two different types of activity&rdquo;.{" "}
              <a
                href="https://www.hcpc-uk.org/cpd/carrying-out-and-recording-cpd/what-activities-count-as-cpd/"
                target="_blank"
                rel="noreferrer"
              >
                Read it on hcpc-uk.org
              </a>
              .
            </>
          ) : (
            <>
              <strong>Most regulators look for a mix.</strong> A record built from one kind of
              learning is weaker evidence than a varied one.
            </>
          )}
        </p>
      </div>

      <form method="get" className="card">
        <div className="field-row">
          <div className="field">
            <label htmlFor="from">From</label>
            <input id="from" name="from" type="date" defaultValue={from} />
          </div>
          <div className="field">
            <label htmlFor="to">To</label>
            <input id="to" name="to" type="date" defaultValue={to} />
          </div>
          <div className="field field--action">
            <button type="submit" className="btn btn--secondary">
              Update period
            </button>
          </div>
        </div>
        {isHcpc && (
          <p className="hint">
            Tip: match this to your two-year HCPC cycle.
          </p>
        )}
      </form>

      {missing.length > 0 && (
        <div className="notice notice--warn">
          <h3 className="notice__title">
            Missing {missing.length === 1 ? "one type" : `${missing.length} types`}
          </h3>
          <p className="small">
            {missing.map((t) => t.type).join(", ")} — nothing recorded in this period.
          </p>
        </div>
      )}

      {/* One card holding five sections, rather than five cards that look
          identical and make the page read as a list of clones. */}
      <div className="card">
        {byType.map(({ type, activities }) => (
        <section className="type-section" key={type}>
          <div className="page-head page-head--tight">
            <div>
              <h2>{type}</h2>
              <p className="muted small">
                {ACTIVITY_TYPE_EXAMPLES[type]}
              </p>
            </div>
            <span className={`badge ${activities.length ? "badge--verified" : "badge--neutral"}`}>
              {activities.length
                ? `${activities.length} ${activities.length === 1 ? "activity" : "activities"}`
                : "None yet"}
            </span>
          </div>

          {activities.length === 0 ? (
            <p className="muted small">
              Nothing in this period.{" "}
              <Link href="/record/new">Log something under this type →</Link>
            </p>
          ) : (
            <div className="table-wrap">
              <table className="table table--stack">
                <tbody>
                  {activities.map((e) => (
                    <tr key={e.id}>
                      <td className="col--date" data-label="When">{formatDate(e.activity_date)}</td>
                      <td data-label=".">
                        <strong>{e.title}</strong>
                        {e.provider && <div className="muted small">{e.provider}</div>}
                      </td>
                      <td className="small col--type" data-label="CPD">
                        {e.points != null ? `${e.points} pts` : ""}
                        {e.points != null && e.hours != null ? " · " : ""}
                        {e.hours != null ? `${e.hours} h` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(() => {
            const target = goalFor(type);
            const days = daysUntil(target);
            const met = activities.length > 0;
            return (
              <>
                {target && (
                  <p className="small">
                    {met ? (
                      <span className="badge badge--verified">✓ Met before {formatDate(target)}</span>
                    ) : (
                      <span className="badge badge--neutral">
                        Target {formatDate(target)}
                        {days !== null &&
                          (days < 0
                            ? ` — ${Math.abs(days)} days overdue`
                            : days === 0
                              ? " — today"
                              : ` — ${days} days left`)}
                      </span>
                    )}
                  </p>
                )}
                <TypeGoalForm activityType={type} targetDate={target} />
              </>
            );
          })()}
        </section>
        ))}
      </div>
    </main>
  );
}
