import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb, type CpdEntry } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  ACTIVITY_TYPES,
  formatDate,
  GMC_APPRAISAL_REGULATOR,
  HCPC_AUDIT_PACK_REGULATOR,
} from "@/lib/format";
import { frameworkFor, parseStandards } from "@/lib/standards";
import { gapsFor } from "@/lib/completeness";
import { countsTowardCpd, splitByRegistration } from "@/lib/registration";
import { StandardsBadges } from "@/components/standards-picker";
import { deleteEntry } from "@/lib/actions";

export const metadata = { title: "My CPD record — CPD Register" };

type EntryRow = CpdEntry & { verification_code: string | null };

export default async function RecordPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { imported } = await searchParams;
  const importedCount = imported && /^\d+$/.test(imported) ? Number(imported) : 0;

  const entries = await (await getDb())
    .prepare(
      `SELECT e.*, s.verification_code
       FROM cpd_entries e LEFT JOIN signatures s ON s.id = e.signature_id
       WHERE e.user_id = ? ORDER BY e.activity_date DESC, e.id DESC`
    )
    .all(user.id) as EntryRow[];

  // Totals reflect only what can count toward the user's registration; anything
  // earlier is kept and shown, just not added up.
  const { counting } = splitByRegistration(entries, user.registration_date);
  const totalPoints = counting.reduce((sum, e) => sum + (e.points ?? 0), 0);
  const totalHours = counting.reduce((sum, e) => sum + (e.hours ?? 0), 0);

  // Coverage is computed over the same entries this page totals (everything
  // that counts toward the registration), so the two never disagree. The
  // detail page defaults to 12 months, hence the explicit scope in the label.
  const typesCovered = new Set(counting.map((e) => e.activity_type));

  const framework = frameworkFor(user.regulator);
  // Entries that can never count aren't worth nagging anyone to finish.
  const incomplete = counting.filter((e) => gapsFor(e, framework).length > 0).length;

  return (
    <main className="container stack">
      <div className="page-head">
        <div>
          <h1>My CPD record</h1>
          <p>
            {counting.length} entries · {totalPoints} points · {totalHours} hours since you
            registered
          </p>
        </div>
        <div className="actions-row">
          <Link href="/record/new" className="btn">
            Log activity
          </Link>
          <Link href="/record/import" className="btn btn--quiet">
            Import spreadsheet
          </Link>
          <a href="/record/export" className="btn btn--quiet">
            Export CSV
          </a>
          {user.regulator === HCPC_AUDIT_PACK_REGULATOR && (
            <Link href="/record/audit-pack" className="btn btn--quiet">
              HCPC audit pack
            </Link>
          )}
          {user.regulator === GMC_APPRAISAL_REGULATOR && (
            <Link href="/record/appraisal" className="btn btn--quiet">
              GMC appraisal
            </Link>
          )}
        </div>
      </div>

      {importedCount > 0 && (
        <div className="notice notice--ok">
          <p>
            ✓ Imported <strong>{importedCount}</strong> {importedCount === 1 ? "entry" : "entries"}{" "}
            into your record.
          </p>
        </div>
      )}

      <Link href="/record/activity-types" className="card type-strip">
        <div className="type-strip__head">
          <strong>Activity types</strong>
          <span className="muted small">
            {typesCovered.size} of {ACTIVITY_TYPES.length} covered across your record
          </span>
          <span className="type-strip__more">See detail →</span>
        </div>
        <div className="type-strip__chips">
          {ACTIVITY_TYPES.map((type) => {
            const has = typesCovered.has(type);
            return (
              <span
                className={`badge ${has ? "badge--official" : "badge--pending"}`}
                key={type}
              >
                {has ? "✓" : "—"} {type}
              </span>
            );
          })}
        </div>
      </Link>

      {incomplete > 0 && (
        <div className="notice notice--warn">
          <p>
            <strong>
              {incomplete} {incomplete === 1 ? "activity is" : "activities are"} incomplete.
            </strong>{" "}
            Reflection, hours and activity type are what auditors look for.{" "}
            <Link href="/record/complete">Finish them →</Link>
          </p>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="card empty">
          <div className="empty__icon" aria-hidden="true">◔</div>
          <p className="empty__title">Your record starts here</p>
          <p>
            Three ways in: scan the QR at your next event and it is added for you, add something
            you have already done, or bring an existing record across from a spreadsheet.
          </p>
          <div className="actions-row">
            <Link href="/record/new" className="btn">
              Log an activity
            </Link>
            <Link href="/record/import" className="btn btn--secondary">
              Import a spreadsheet
            </Link>
          </div>
          <p className="hint">
            Anything signed at an event arrives marked platform-verified, which is stronger
            evidence than anything typed in afterwards.
          </p>
        </div>
      ) : (
        <div className="card card--flush">
          <div className="table-wrap">
            <table className="table table--stack">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Activity</th>
                  <th>Type</th>
                  {framework && <th>{framework.columnHeader}</th>}
                  <th>CPD</th>
                  <th>Evidence</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const counts = countsTowardCpd(e.activity_date, user.registration_date);
                  return (
                  <tr key={e.id} className={counts ? undefined : "row--precede"}>
                    <td data-label="Date">
                      {formatDate(e.activity_date)}
                      {!counts && (
                        <div>
                          <span className="badge badge--nonofficial" title="Before your registration date, so it can’t count">
                            Pre-registration
                          </span>
                        </div>
                      )}
                    </td>
                    <td data-label=".">
                      <strong>{e.title}</strong>
                      {e.provider && <div className="muted small">{e.provider}</div>}
                      {e.notes && <div className="muted small">{e.notes}</div>}
                    </td>
                    <td className="small" data-label="Type">{e.activity_type}</td>
                    {framework && (
                      <td className="small" data-label={framework.columnHeader}>
                        <StandardsBadges framework={framework} codes={parseStandards(e.standards)} />
                      </td>
                    )}
                    <td className="small" data-label="CPD">
                      {e.is_official ? (
                        <span className="badge badge--official">Official</span>
                      ) : (
                        <span className="badge badge--nonofficial">Unofficial</span>
                      )}
                      <div>
                        {e.points != null ? `${e.points} pts` : ""}
                        {e.points != null && e.hours != null ? " · " : ""}
                        {e.hours != null ? `${e.hours} h` : ""}
                      </div>
                    </td>
                    <td data-label="Evidence">
                      {e.verified ? (
                        <>
                          <span className="badge badge--verified">Platform-verified</span>
                          {e.verification_code && (
                            <div>
                              <a href={`/slip/${e.verification_code}`} className="small">
                                Slip (PDF)
                              </a>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="badge badge--self">Self-reported</span>
                      )}
                    </td>
                    <td>
                      {!e.verified && (
                        <form action={deleteEntry}>
                          <input type="hidden" name="entry_id" value={e.id} />
                          <button type="submit" className="btn btn--danger btn--small">
                            Delete
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="muted small">
        Platform-verified entries are captured live on a register and can&rsquo;t be edited or
        deleted
      </p>
    </main>
  );
}
