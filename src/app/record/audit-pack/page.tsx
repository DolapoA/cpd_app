import { EntryNotes } from "@/components/entry-notes";
import { getDb, type CpdEntry } from "@/lib/db";
import { requireConfirmedUser } from "@/lib/auth";
import { record } from "@/lib/analytics";
import { ACTIVITY_TYPES, formatDate, HCPC_AUDIT_PACK_REGULATOR } from "@/lib/format";
import { frameworkFor, parseStandards } from "@/lib/standards";
import { clampToRegistration } from "@/lib/registration";
import { getBaseUrl } from "@/lib/base-url";
import { PrintButton } from "@/components/print-button";
import { PackColumnsForm } from "@/components/pack-columns-form";
import { resolvePackColumns } from "@/lib/pack-columns";

export const metadata = { title: "HCPC audit pack — CPD Register" };

export default async function AuditPackPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; cols?: string | string[] }>;
}) {
  const user = await requireConfirmedUser();
  await record({ name: "compliance_pack_generated", kind: "hcpc" });

  const sp = await searchParams;
  const to = sp.to ?? new Date().toISOString().slice(0, 10);
  const requestedFrom =
    sp.from ??
    new Date(new Date(to + "T00:00:00").getTime() - 2 * 365 * 24 * 60 * 60 * 1000)
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

  // Absent from the query string means "not chosen yet", which is different
  // from "chosen nothing" — the first view shows the full pack.
  const chosen =
    sp.cols === undefined
      ? null
      : (Array.isArray(sp.cols) ? sp.cols : [sp.cols]).filter((c) => c !== "");
  const columns = resolvePackColumns("hcpc", framework, user.regulator ?? "Your regulator", chosen);
  const show = (id: Parameters<typeof columns.visible.has>[0]) => columns.visible.has(id);
  const byType = ACTIVITY_TYPES.map((t) => ({
    type: t,
    count: entries.filter((e) => e.activity_type === t).length,
  }));
  const totalPoints = entries.reduce((sum, e) => sum + (e.points ?? 0), 0);
  const totalHours = entries.reduce((sum, e) => sum + (e.hours ?? 0), 0);

  return (
    <main className="container print-doc stack">
      <div className="page-head no-print">
        <div>
          <h1>HCPC audit pack</h1>
          <p>
            A dated record of your CPD for the period, structured for an HCPC profile. Adjust
            the period, then print or save as PDF.
          </p>
        </div>
        <PrintButton />
      </div>

      {user.regulator !== HCPC_AUDIT_PACK_REGULATOR && (
        <div className="notice notice--warn no-print">
          <p className="small">
            This pack follows HCPC standards. Your profile is set to{" "}
            <strong>{user.regulator ?? "no regulator selected"}</strong>, so it may not match what
            your own regulator expects.{" "}
            <a href="/record/export">Export a plain CSV</a> instead, or{" "}
            <a href="/profile">update your profile</a> if HCPC is in fact your regulator.
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
        <p className="hint">
          Tip: match this to your two-year HCPC cycle.
        </p>
        {/* Keeps the column choice when only the period changes. */}
        {chosen?.map((c) => (
          <input key={c} type="hidden" name="cols" value={c} />
        ))}
      </form>

      <PackColumnsForm selection={columns} hiddenFields={{ from, to }} />

      <div className="card">
        <h1>Continuing Professional Development record</h1>
        <p className="doc-meta">
          {user.full_name}
          {user.profession ? ` — ${user.profession}` : ""}
          {user.registration_number ? ` — HCPC registration ${user.registration_number}` : ""}
          <br />
          Period: {formatDate(from)} to {formatDate(to)} · Generated{" "}
          {formatDate(new Date().toISOString().slice(0, 10))} by CPD Register
        </p>

        <h2>Summary of CPD activity (HCPC standards 1 &amp; 2)</h2>
        <p className="muted small">
          {entries.length} activities · {totalPoints} points · {totalHours} learning hours. Mix of
          learning activity types across the period:
        </p>
        <table className="table">
          <tbody>
            {byType.map((row) => (
              <tr key={row.type}>
                <td className="col--code">{row.type}</td>
                <td>
                  <strong>{row.count}</strong> {row.count === 1 ? "activity" : "activities"}
                  {row.count === 0 && (
                    <span className="muted small"> — none recorded this period</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {framework && (
        <div className="card">
          <h2>Coverage of the {framework.noun}s</h2>
          <p className="muted small">
            Activities tagged against each standard in this period.
          </p>
          <table className="table">
            <tbody>
              {framework.items.map((item) => {
                const count = entries.filter((e) =>
                  parseStandards(e.standards).includes(item.code)
                ).length;
                return (
                  <tr key={item.code}>
                    <td className="col--num">
                      <strong>{item.code}</strong>
                    </td>
                    <td>{item.title}</td>
                    <td>
                      <strong>{count}</strong>{" "}
                      {count === 1 ? "activity" : "activities"}
                      {count === 0 && (
                        <span className="muted small"> — none tagged</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {entries.some((e) => parseStandards(e.standards).length === 0) && (
            <p className="muted small">
              Untagged activities aren&rsquo;t counted above.
            </p>
          )}
        </div>
      )}

      <div className="card">
        <h2>Dated record of activities</h2>
        {entries.length === 0 ? (
          <p className="muted">No activities recorded in this period.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {show("date") && <th>Date</th>}
                  {show("activity") && <th>Activity</th>}
                  {show("provider") && <th>Provider</th>}
                  {show("type") && <th>Type</th>}
                  {show("standards") && framework && <th>{framework.columnHeader}</th>}
                  {show("reflection") && <th>Reflection and outcomes</th>}
                  {show("cpd") && <th>CPD</th>}
                  {show("evidence") && <th>Evidence</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    {show("date") && <td>{formatDate(e.activity_date)}</td>}
                    {show("activity") && (
                      <td>
                        <strong>{e.title}</strong>
                      </td>
                    )}
                    {show("provider") && <td className="small">{e.provider ?? "—"}</td>}
                    {show("type") && <td className="small">{e.activity_type}</td>}
                    {show("standards") && framework && (
                      <td className="small">{parseStandards(e.standards).join(", ") || "—"}</td>
                    )}
                    {show("reflection") && (
                      <td className="small">
                        {e.notes ? <EntryNotes notes={e.notes} /> : "—"}
                      </td>
                    )}
                    {show("cpd") && (
                      <td className="small">
                        {e.is_official ? "Official" : "Unofficial"}
                        <div>
                          {e.points != null ? `${e.points} pts` : ""}
                          {e.points != null && e.hours != null ? " · " : ""}
                          {e.hours != null ? `${e.hours} h` : ""}
                        </div>
                      </td>
                    )}
                    {show("evidence") && (
                      <td className="small">
                        {e.verified ? "Platform-verified attendance" : "Self-reported"}
                        {e.verification_code && (
                          <div className="mono">
                            {e.verification_code}
                            <br />
                            Verify: {baseUrl}/verify/{e.verification_code}
                          </div>
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
          Platform-verified entries were captured live on a register, timestamped server-side
          and immutable, each with a code an auditor can check online. This supports — but
          doesn&rsquo;t replace — the written CPD profile HCPC asks for at audit.
        </p>
      </div>
    </main>
  );
}
