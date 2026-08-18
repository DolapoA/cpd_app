import { frameworkFor, parseStandards } from "@/lib/standards";
import { EntryNotes } from "@/components/entry-notes";
import { getDb, type CpdEntry } from "@/lib/db";
import { requireConfirmedUser } from "@/lib/auth";
import { record } from "@/lib/analytics";
import { formatDate, GMC_APPRAISAL_REGULATOR } from "@/lib/format";
import { clampToRegistration } from "@/lib/registration";
import { getBaseUrl } from "@/lib/base-url";
import { PrintButton } from "@/components/print-button";
import { PackColumnsForm } from "@/components/pack-columns-form";
import { resolvePackColumns } from "@/lib/pack-columns";

export const metadata = { title: "GMC appraisal summary — CPD Register" };

export default async function AppraisalPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; cols?: string | string[] }>;
}) {
  const user = await requireConfirmedUser();
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
  const framework = frameworkFor(user.regulator);
  const chosen =
    sp.cols === undefined
      ? null
      : (Array.isArray(sp.cols) ? sp.cols : [sp.cols]).filter((c) => c !== "");
  const columns = resolvePackColumns("gmc", framework, user.regulator ?? "Your regulator", chosen);
  const show = (id: Parameters<typeof columns.visible.has>[0]) => columns.visible.has(id);
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
            <table className="table table--stack">
              <thead>
                <tr>
                  {show("date") && <th>Date</th>}
                  {show("activity") && <th>Activity</th>}
                  {show("provider") && <th>Provider</th>}
                  {show("type") && <th>Type</th>}
                  {show("standards") && framework && <th>{framework.columnHeader}</th>}
                  {show("cpd") && <th>Credits / hours</th>}
                  {show("reflection") && <th>Reflection</th>}
                  {show("evidence") && <th>Evidence</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    {show("date") && <td data-label="Date">{formatDate(e.activity_date)}</td>}
                    {show("activity") && (<td data-label=".">
                        <strong>{e.title}</strong>
                        {e.is_official && <div className="muted small">Official CPD</div>}
                      </td>
                    )}
                    {show("provider") && <td className="small" data-label="Provider">{e.provider ?? "—"}</td>}
                    {show("type") && <td className="small" data-label="Type">{e.activity_type}</td>}
                    {show("standards") && framework && (
                      <td className="small" data-label={framework.columnHeader}>{parseStandards(e.standards).join(", ") || "—"}</td>
                    )}
                    {show("cpd") && (<td className="small" data-label="CPD">
                        {e.points != null ? `${e.points} pts` : "—"}
                        {e.hours != null ? ` · ${e.hours} h` : ""}
                      </td>
                    )}
                    {show("reflection") && (<td className="small" data-label="Reflection">{e.notes ? <EntryNotes notes={e.notes} /> : "—"}</td>
                    )}
                    {show("evidence") && (<td className="small" data-label="Evidence">
                        {e.verified ? "Platform-verified" : "Self-reported"}
                        {e.verification_code && (
                          <div className="mono">{baseUrl}/verify/{e.verification_code}</div>
                        )}
                      </td>
                    )}
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
