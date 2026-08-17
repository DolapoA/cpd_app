import Link from "next/link";
import { getDb, type ActivityTypeGoal, type CpdEntry, type PlannedEvent } from "@/lib/db";
import { requireConfirmedUser } from "@/lib/auth";
import {
  ACTIVITY_TYPES,
  formatDate,
  GMC_APPRAISAL_REGULATOR,
  GTCS_UPDATE_REGULATOR,
  HCPC_AUDIT_PACK_REGULATOR,
  isEngineeringBody,
} from "@/lib/format";
import { frameworkFor } from "@/lib/standards";
import { gapsFor } from "@/lib/completeness";
import { countsTowardCpd } from "@/lib/registration";
import { daysUntil, goalUrgency } from "@/lib/goal";
import { setupState } from "@/lib/setup";
import { hideSetupPrompt } from "@/lib/actions";
import { SetupChecklist } from "@/components/setup-checklist";

export const metadata = { title: "Dashboard — CPD Register" };

export default async function DashboardPage() {
  const user = await requireConfirmedUser();

  const db = await getDb();
  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const entries = await db
    .prepare("SELECT * FROM cpd_entries WHERE user_id = ? ORDER BY activity_date DESC")
    .all(user.id) as CpdEntry[];
  // Only activity that can count toward the registration is totalled.
  const countable = entries.filter((e) => countsTowardCpd(e.activity_date, user.registration_date));
  const lastYear = countable.filter((e) => e.activity_date >= yearAgo);

  const points = lastYear.reduce((sum, e) => sum + (e.points ?? 0), 0);
  const hours = lastYear.reduce((sum, e) => sum + (e.hours ?? 0), 0);
  const verified = lastYear.filter((e) => e.verified).length;
  const typesCovered = new Set(lastYear.map((e) => e.activity_type));
  const target = user.annual_target_points;
  const pct = target > 0 ? Math.min(100, Math.round((points / target) * 100)) : 0;

  const framework = frameworkFor(user.regulator);
  const incomplete = countable.filter((e) => gapsFor(e, framework).length > 0).length;

  // Reminders for per-activity-type targets. A goal only nags once its type is
  // still uncovered and the date is within 90 days, so this stays quiet rather
  // than becoming background noise all year.
  // What they have planned, and anything whose date has passed without an
  // answer — the moment a plan either becomes evidence or is forgotten.
  const today = new Date().toISOString().slice(0, 10);
  const plans = (await db
    .prepare(
      "SELECT * FROM planned_events WHERE user_id = ? AND outcome IS NULL ORDER BY starts_on"
    )
    .all(user.id)) as PlannedEvent[];
  const upcoming = plans.filter((p) => (p.ends_on ?? p.starts_on) >= today).slice(0, 3);
  const unanswered = plans.filter((p) => (p.ends_on ?? p.starts_on) < today);

  // The setup prompt is shown until the profile is complete, or until it is
  // put away. Suggestions do not hold it open: someone who has told us
  // everything we need should stop being asked for anything.
  const registerCount = Number(
    (
      (await db
        .prepare("SELECT COUNT(*) AS c FROM registers WHERE organiser_id = ?")
        .get(user.id)) as { c: number }
    ).c
  );
  const setup = setupState(user, {
    entries: entries.length,
    plans: plans.length,
    registers: registerCount,
  });
  const showSetup = !setup.complete && !user.setup_hidden_at;

  const goals = await db
    .prepare("SELECT * FROM activity_type_goals WHERE user_id = ?")
    .all(user.id) as ActivityTypeGoal[];
  const dueGoals = goals
    .filter((g) => !typesCovered.has(g.activity_type))
    .map((g) => ({ ...g, days: daysUntil(g.target_date) }))
    .filter((g) => goalUrgency(g.days) !== "none")
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));
  const anyOverdue = dueGoals.some((g) => (g.days ?? 0) < 0);

  return (
    <main className="container stack">
      <div className="page-head">
        <div>
          <h1>Welcome back, {user.full_name.split(" ")[0]}</h1>
          <p>Your CPD activity over the last 12 months.</p>
        </div>
        <div className="actions-row">
          <Link href="/registers/new" className="btn">
            New register
          </Link>
          <Link href="/record/new" className="btn btn--secondary">
            Log activity
          </Link>
        </div>
      </div>

      {showSetup && (
        <div className="card">
          <div className="page-head">
            <h2>Finish setting up</h2>
            <form action={hideSetupPrompt}>
              <button type="submit" className="btn btn--quiet btn--small">
                Hide this
              </button>
            </form>
          </div>
          <SetupChecklist state={setup} />
        </div>
      )}

      <div className="grid-4">
        <div className="stat">
          <div className="stat__value">
            {points}
            <span className="stat__unit">
              {" "}
              / {target}
            </span>
          </div>
          <div className="stat__label">CPD points vs annual target ({pct}%)</div>
        </div>
        <div className="stat">
          <div className="stat__value">{hours}</div>
          <div className="stat__label">Learning hours</div>
        </div>
        <div className="stat">
          <div className="stat__value">{lastYear.length}</div>
          <div className="stat__label">Activities recorded ({verified} verified)</div>
        </div>
        <Link href="/record/activity-types" className="stat stat--link">
          <div className="stat__value">
            {typesCovered.size}
            <span className="stat__unit">
              {" "}
              / {ACTIVITY_TYPES.length}
            </span>
          </div>
          <div className="stat__label">
            Activity types covered{user.regulator === HCPC_AUDIT_PACK_REGULATOR ? " (HCPC mix)" : ""}
            <span className="stat__more"> — see which →</span>
          </div>
        </Link>
      </div>

      {incomplete > 0 && (
        <div className="notice notice--warn">
          <h3 className="notice__title">To do</h3>
          <p className="small">
            <strong>
              {incomplete} {incomplete === 1 ? "activity is" : "activities are"} incomplete.
            </strong>{" "}
            Register sign-ins and imports often arrive without reflection.{" "}
            <Link href="/record/complete">Finish them →</Link>
          </p>
        </div>
      )}

      {unanswered.length > 0 && (
        <div className="notice notice--info">
          <h3 className="notice__title">Did you go?</h3>
          <p className="small">
            {unanswered.length === 1
              ? `${unanswered[0].title} has been and gone.`
              : `${unanswered.length} things you planned have been and gone.`}{" "}
            Say whether you attended and it joins your record.{" "}
            <Link href="/record/planned">Answer now →</Link>
          </p>
        </div>
      )}

      {dueGoals.length > 0 && (
        <div className={`notice${anyOverdue ? " notice--warn" : " notice--info"}`}>
          <h3 className="notice__title">
            {anyOverdue ? "Target passed" : "Targets coming up"}
          </h3>
          <ul className="small bullets">
            {dueGoals.map((g) => (
              <li key={g.activity_type}>
                <strong>{g.activity_type}</strong> —{" "}
                {g.days === null
                  ? "target set"
                  : g.days < 0
                    ? `${Math.abs(g.days)} days overdue`
                    : g.days === 0
                      ? "due today"
                      : `${g.days} days left`}
                , nothing recorded yet.
              </li>
            ))}
          </ul>
          <p className="small">
            <Link href="/record/activity-types">See what would fill them →</Link>
          </p>
        </div>
      )}

      {user.regulator === "HCPC" && typesCovered.size < 2 && lastYear.length > 0 && (
        <div className="card">
          <p className="small">
            ⚠ HCPC expects a <strong>mix of learning types</strong>. Your last 12 months show
            only {typesCovered.size === 1 ? "one" : "none"}.{" "}
            <Link href="/record/activity-types">See what&rsquo;s missing →</Link>
          </p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="card">
          <div className="page-head">
            <h2>Coming up</h2>
            <Link href="/record/planned" className="small">
              Planned CPD →
            </Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {upcoming.map((p) => (
                  <tr key={p.id}>
                    <td className="col--date">{formatDate(p.starts_on)}</td>
                    <td>
                      <strong>{p.title}</strong>
                      <div className="muted small">
                        {[p.provider, p.location].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td className="small">
                      {p.expected_points != null ? `${p.expected_points} pts expected` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="page-head">
          <h2>Recent activity</h2>
          <Link href="/record" className="small">
            Full record →
          </Link>
        </div>
        {entries.length === 0 ? (
          <div className="empty">
            <p className="empty__title">Nothing recorded yet</p>
            <p className="small">
              Your CPD appears here as you record it — automatically when you sign a register,
              or whenever you add something yourself.
            </p>
            <div className="actions-row">
              <Link href="/record/new" className="btn btn--secondary">
                Log an activity
              </Link>
              <Link href="/record/import" className="btn btn--quiet">
                Import a spreadsheet
              </Link>
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {entries.slice(0, 6).map((e) => (
                  <tr key={e.id}>
                    <td>{formatDate(e.activity_date)}</td>
                    <td>
                      <strong>{e.title}</strong>
                      <div className="muted small">{e.activity_type}</div>
                    </td>
                    <td>
                      {e.verified ? (
                        <span className="badge badge--verified">Platform-verified</span>
                      ) : (
                        <span className="badge badge--self">Self-reported</span>
                      )}
                    </td>
                    <td className="small">
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
      </div>

      {(user.regulator === HCPC_AUDIT_PACK_REGULATOR ||
        user.regulator === GMC_APPRAISAL_REGULATOR ||
        user.regulator === GTCS_UPDATE_REGULATOR ||
        isEngineeringBody(user.regulator)) && (
        <>
          {user.regulator === HCPC_AUDIT_PACK_REGULATOR && (
            <div className="card">
              <h3>HCPC audit pack</h3>
              <p className="muted small">
                A dated record for your two-year cycle, ready if you&rsquo;re audited.
              </p>
              <Link href="/record/audit-pack" className="btn btn--secondary">
                Generate audit pack
              </Link>
            </div>
          )}
          {isEngineeringBody(user.regulator) && (
            <div className="card">
              <h3>CPD record for sampling</h3>
              <p className="muted small">
                Your last twelve months, ready if you are picked for the annual 5% sample.
              </p>
              <Link href="/record/engineering" className="btn btn--secondary">
                Generate the record
              </Link>
            </div>
          )}
          {user.regulator === GTCS_UPDATE_REGULATOR && (
            <div className="card">
              <h3>Professional Update record</h3>
              <p className="muted small">
                Your reflective record of professional learning, over the five-year cycle.
              </p>
              <Link href="/record/professional-update" className="btn btn--secondary">
                Generate the record
              </Link>
            </div>
          )}
          {user.regulator === GMC_APPRAISAL_REGULATOR && (
            <div className="card">
              <h3>GMC appraisal summary</h3>
              <p className="muted small">
                Your last 12 months of CPD, ready for appraisal and revalidation.
              </p>
              <Link href="/record/appraisal" className="btn btn--secondary">
                Generate appraisal summary
              </Link>
            </div>
          )}
        </>
      )}

      {user.regulator !== HCPC_AUDIT_PACK_REGULATOR &&
        user.regulator !== GMC_APPRAISAL_REGULATOR &&
        user.regulator !== GTCS_UPDATE_REGULATOR &&
        !isEngineeringBody(user.regulator) && (
        <div className="card">
          <h3>Export your CPD record</h3>
          <p className="muted small">
            {user.regulator && user.regulator !== "Other" && user.regulator !== "None"
              ? `There isn't a dedicated ${user.regulator} compliance pack yet — `
              : "There isn't a dedicated compliance pack for your profile yet — "}
            export your full record as CSV to attach as supporting evidence for your own audit or
            appraisal process.
          </p>
          <Link href="/record/export" className="btn btn--secondary">
            Export CSV
          </Link>
        </div>
      )}
    </main>
  );
}
