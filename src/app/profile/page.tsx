import Link from "next/link";
import { redirect } from "next/navigation";
import { updateProfile } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { REGULATORS } from "@/lib/format";
import { ActionForm } from "@/components/action-form";

export const metadata = { title: "Profile — CPD Register" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Your profile</h1>
          <p>These pre-fill any register you sign.</p>
        </div>
      </div>
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
            <label>Email</label>
            <input type="email" value={user.email} disabled />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="profession">Profession</label>
              <input
                id="profession"
                name="profession"
                type="text"
                defaultValue={user.profession ?? ""}
              />
            </div>
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
          <div className="field">
            <label htmlFor="annual_target_points">Annual CPD target (points/credits)</label>
            <input
              id="annual_target_points"
              name="annual_target_points"
              type="number"
              min={0}
              step="0.5"
              defaultValue={user.annual_target_points}
            />
            <div className="hint">e.g. 50 credits a year for doctors.</div>
          </div>
        </ActionForm>
      </div>
          <p className="muted small">
        Sign-in, security and closing your account are on <Link href="/account">your account page</Link>.
      </p>
    </main>
  );
}
