import Link from "next/link";
import { updateProfile } from "@/lib/actions";
import { requireConfirmedUser } from "@/lib/auth";
import { REGULATORS } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { ProfessionField } from "@/components/profession-field";
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
  const count = async (sql: string) =>
    Number(((await db.prepare(sql).get(user.id)) as { c: number }).c);
  const setup = setupState(user, {
    entries: await count("SELECT COUNT(*) AS c FROM cpd_entries WHERE user_id = ?"),
    plans: await count("SELECT COUNT(*) AS c FROM planned_events WHERE user_id = ?"),
    registers: await count("SELECT COUNT(*) AS c FROM registers WHERE organiser_id = ?"),
  });

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Your profile</h1>
          <p>These pre-fill any register you sign.</p>
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
                Not listed? Choose &ldquo;Other&rdquo;. This sets which compliance packs you get.
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
              Optional. CPD before this date won&rsquo;t count towards your registration.
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
            </label>
            <div className="hint">
              Turning this off hides their events from you. It does not un-share yours, and it
              never reveals who shared what either way.
            </div>
          </div>
        </ActionForm>
      </div>
      {/* This was a grey footnote, which made it the only route to the
          password, two-factor and account-closure controls — a link people
          have to already know is there. Security settings nobody can find
          are security settings nobody uses. */}
      <div className="card">
        <h2>Account and security</h2>
        <Link href="/account" className="btn btn--secondary">
          Go to your account
        </Link>
      </div>
    </main>
  );
}
