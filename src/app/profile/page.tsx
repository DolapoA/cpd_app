import Link from "next/link";
import { updateProfile } from "@/lib/actions";
import { requireConfirmedUser } from "@/lib/auth";
import { REGULATORS } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { ProfessionField } from "@/components/profession-field";
import { InfoHint } from "@/components/info-hint";
import { TargetField } from "@/components/target-field";
import { SetupChecklist } from "@/components/setup-checklist";
import { getDb } from "@/lib/db";
import { setupState } from "@/lib/setup";

export const metadata = { title: "Profile — CPD Register" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const saved = (await searchParams).saved === "1";
  const user = await requireConfirmedUser();

  const db = await getDb();
  // One statement rather than three: the checklist needs all three tallies
  // before it can say anything, and asking separately made the page wait for
  // the network three times over.
  const counts = (await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM cpd_entries     WHERE user_id = ?)      AS entries,
         (SELECT COUNT(*) FROM planned_events  WHERE user_id = ?)      AS plans,
         (SELECT COUNT(*) FROM registers       WHERE organiser_id = ?) AS registers,
         (SELECT COUNT(*) FROM employments     WHERE user_id = ?)      AS jobs`
    )
    .get(user.id, user.id, user.id, user.id)) as {
    entries: string;
    plans: string;
    registers: string;
    jobs: string;
  };
  const jobCount = Number(counts.jobs);
  const setup = setupState(user, {
    entries: Number(counts.entries),
    plans: Number(counts.plans),
    registers: Number(counts.registers),
  });

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Your profile</h1>
          <p>
            These pre-fill any register you sign.{" "}
            <Link href="/faq">Questions and answers</Link>
          </p>
        </div>
      </div>

      {saved && (
        <div className="notice notice--ok">
          <p className="small">
            <strong>Saved.</strong> Your details are as shown below.
          </p>
        </div>
      )}

      {/* Only while there is something left to do. A panel congratulating
          someone on a finished list is a permanent fixture on a page they
          came to edit — the fields below are the profile, and once nothing is
          outstanding they should be the whole page. */}
      {!setup.complete && (
        <div className="notice notice--info">
          <h3 className="notice__title">Finish your profile</h3>
          <p className="small">
            Each of these decides something: which audit pack we can produce, which activity
            counts, and who you share events with.
          </p>
          <SetupChecklist state={setup} />
        </div>
      )}

      <div className="card">
        <ActionForm action={updateProfile} submitLabel="Save changes">
          <div className="field">
            <label htmlFor="full_name">Full name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              defaultValue={user.full_name}
            />
          </div>
          <div className="field">
            {/* A label with nothing to point at is invisible to a screen
                reader, which then announces this as an unnamed field. */}
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={user.email} disabled readOnly />
            <div className="hint">
              You sign in with this address, and attendance slips are matched to it.
            </div>
          </div>
          <div className="field-row">
            <ProfessionField defaultValue={user.profession} />
            <div className="field">
              <label htmlFor="role_grade">Role / grade</label>
              <input
                id="role_grade"
                name="role_grade"
                type="text"
                defaultValue={user.role_grade ?? ""}
                placeholder="e.g. Band 6, ST4"
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="regulator">Regulator</label>
              <select id="regulator" name="regulator" defaultValue={user.regulator ?? ""}>
                <option value="">Choose…</option>
                {REGULATORS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <div className="hint">
                Not listed? Choose &ldquo;Other&rdquo;.
              </div>
            </div>
            <div className="field">
              <label htmlFor="registration_number">Registration number</label>
              <input
                id="registration_number"
                name="registration_number"
                type="text"
                defaultValue={user.registration_number ?? ""}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="registration_date">Registration date</label>
            <input
              id="registration_date"
              name="registration_date"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              defaultValue={user.registration_date ?? ""}
            />
            <div className="hint">
              Optional.
            </div>
          </div>
          <TargetField value={user.annual_target_points} />
          <div className="field">
            <label className="choice" htmlFor="discover_events">
              <input
                id="discover_events"
                name="discover_events"
                type="checkbox"
                defaultChecked={!!user.discover_events}
              />{" "}
              Show me events others in my profession have shared
              <InfoHint label="What turning this off does">
                Turning this off hides their events from you. It does not un-share yours, and it
                never reveals who shared what either way.
              </InfoHint>
            </label>
          </div>
        </ActionForm>
      </div>
      {/* This was a grey footnote, which made it the only route to the
          password, two-factor and account-closure controls — a link people
          have to already know is there. Security settings nobody can find
          are security settings nobody uses. */}
      <div className="card">
        <div className="page-head page-head--tight">
          <h2>Where you have worked</h2>
          <Link href="/profile/employment" className="btn btn--quiet btn--small">
            {jobCount === 0 ? "Add an employer" : "Edit"}
          </Link>
        </div>
        <p className="muted small">
          {jobCount === 0
            ? "Not recorded yet."
            : `${jobCount} ${jobCount === 1 ? "job" : "jobs"} recorded.`}
        </p>
      </div>

      <div className="card">
        <h2>Account and security</h2>
        <Link href="/account" className="btn btn--secondary">
          Go to your account
        </Link>
      </div>
    </main>
  );
}
