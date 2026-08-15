import { redirect } from "next/navigation";
import { getDb, type CpdEntry } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { record } from "@/lib/analytics";
import { formatDate, GMC_APPRAISAL_REGULATOR } from "@/lib/format";
import { clampToRegistration } from "@/lib/registration";
import { getBaseUrl } from "@/lib/base-url";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "GMC appraisal summary — CPD Register" };

export default async function AppraisalPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await record({ name: "compliance_pack_generated", kind: "gmc" });

  const sp = await searchParams;
  const to = sp.to ?? new Date().toISOString().slice(0, 10);
  const requestedFrom =
    sp.from ??
    new Date(new Date(to + "T00:00:00").getTime() - 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  // A period can't sensibly start before the user joined the register.
  const from = clampToRegistration(requestedFrom, user.registration_date);

  const entries = await (await getDb())
    .prepare(
      `SELECT e.*, s.verification_code
       FROM cpd_entries e LEFT JOIN signatures s ON s.id = e.signature_id
       WHERE e.user_id = ? AND e.activity_date >= ? AND e.activity_date <= ?
       ORDER BY e.activity_date ASC`
    )
    .all(user.id, from, to) as (CpdEntry & { verification_code: string | null })[];

  const baseUrl = await getBaseUrl();
  const totalPoints = entries.reduce((sum, e) => sum + (e.points ?? 0), 0);
  const totalHours = entries.reduce((sum, e) => sum + (e.hours ?? 0), 0);
  const official = entries.filter((e) => e.is_official).length;

  return (
    <main className="container print-doc stack">
      <div className="page-head no-print">
        <div>
          <h1>GMC appraisal summary</h1>
          <p>
            CPD supporting information for your appraisal year. Defaults to the last 12 months.
          </p>
        </div>
        <PrintButton />
      </div>

      {user.regulator !== GMC_APPRAISAL_REGULATOR && (
        <div className="notice notice--warn no-print">
          <p className="small">
            This summary follows GMC appraisal and revalidation. Your profile is set to{" "}
            <strong>{user.regulator ?? "no regulator selected"}</strong>, so it may not match what
            your own regulator expects.{" "}
            <a href="/record/export">Export a plain CSV</a> instead, or{" "}
            <a href="/profile">update your profile</a> if GMC is in fact your regulator.
          </p>
        </div>
      )}

      {user.registration_date && from === user.registration_date && requestedFrom < from && (
        <div className="card no-print">
          <p className="small muted">
            Starts on {formatDate(from)}, your registration date — CPD before then can&rsquo;t
            count. Change it in <a href="/profile">your profile</a> if that&rsquo;s wrong.
          </p>
        </div>
      )}

      <form method="get" className="card no-print">
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
      </form>

      <div className="card">
        <h1>CPD supporting information for appraisal</h1>
        <p className="doc-meta">
          {user.full_name}
          {user.profession ? ` — ${user.profession}` : ""}
          {user.registration_number ? ` — GMC number ${user.registration_number}` : ""}
          <br />
          Appraisal period: {formatDate(from)} to {formatDate(to)} · Generated{" "}
          {formatDate(new Date().toISOString().slice(0, 10))} by CPD Register
        </p>

        <div className="grid-4">
          <div className="stat">
            <div className="stat__value">{totalPoints}</div>
            <div className="stat__label">CPD points / credits</div>
          </div>
          <div className="stat">
            <div className="stat__value">{totalHours}</div>
            <div className="stat__label">Learning hours</div>
          </div>
          <div className="stat">
            <div className="stat__value">{entries.length}</div>
            <div className="stat__label">Activities</div>
          </div>
          <div className="stat">
            <div className="stat__value">{official}</div>
            <div className="stat__label">Accredited (official) events</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Activities and reflection</h2>
        {entries.length === 0 ? (
          <p className="muted">No activities recorded in this period.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Activity</th>
                  <th>Credits / hours</th>
                  <th>Reflection</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDate(e.activity_date)}</td>
                    <td>
                      <strong>{e.title}</strong>
                      {e.provider && <div className="muted small">{e.provider}</div>}
                      <div className="muted small">
                        {e.activity_type}
                        {e.is_official ? " · Official CPD" : ""}
                      </div>
                    </td>
                    <td className="small">
                      {e.points != null ? `${e.points} pts` : "—"}
                      {e.hours != null ? ` · ${e.hours} h` : ""}
                    </td>
                    <td className="small">{e.notes ?? "—"}</td>
                    <td className="small">
                      {e.verified ? "Platform-verified" : "Self-reported"}
                      {e.verification_code && (
                        <div className="mono">{baseUrl}/verify/{e.verification_code}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small">
          Platform-verified entries were captured live on a register with server-side
          timestamps; each verification URL can be checked by an appraiser. Suitable as CPD
          supporting information under Good Medical Practice.
        </p>
      </div>
    </main>
  );
}
