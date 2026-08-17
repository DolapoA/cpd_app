import Link from "next/link";
import { EntryNotes } from "@/components/entry-notes";
import { PrintButton } from "@/components/print-button";
import { PackColumnsForm } from "@/components/pack-columns-form";
import { getDb, type CpdEntry } from "@/lib/db";
import { requireConfirmedUser } from "@/lib/auth";
import { record } from "@/lib/analytics";
import { ACTIVITY_TYPES, formatDate, isEngineeringBody } from "@/lib/format";
import { frameworkFor, parseStandards } from "@/lib/standards";
import { clampToRegistration } from "@/lib/registration";
import { getBaseUrl } from "@/lib/base-url";
import { resolvePackColumns } from "@/lib/pack-columns";

export const metadata = { title: "CPD record for sampling — CPD Register" };

export default async function EngineeringCpdPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; cols?: string | string[] }>;
}) {
  const user = await requireConfirmedUser();
  await record({ name: "compliance_pack_generated", kind: "engineering" });

  const sp = await searchParams;
  const to = sp.to ?? new Date().toISOString().slice(0, 10);
  // The sample asks you to confirm the preceding 12 months.
  const requestedFrom =
    sp.from ??
    new Date(new Date(to + "T00:00:00").getTime() - 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  const from = clampToRegistration(requestedFrom, user.registration_date);

  const entries = (await (await getDb())
    .prepare(
      `SELECT e.*, s.verification_code
       FROM cpd_entries e LEFT JOIN signatures s ON s.id = e.signature_id
       WHERE e.user_id = ? AND e.activity_date >= ? AND e.activity_date <= ?
       ORDER BY e.activity_date ASC`
    )
    .all(user.id, from, to)) as (CpdEntry & { verification_code: string | null })[];

  const baseUrl = await getBaseUrl();
  const framework = frameworkFor(user.regulator);
  const chosen =
    sp.cols === undefined
      ? null
      : (Array.isArray(sp.cols) ? sp.cols : [sp.cols]).filter((c) => c !== "");
  const body = user.regulator ?? "your institution";
  const columns = resolvePackColumns("engineering", framework, body, chosen);
  const show = (id: Parameters<typeof columns.visible.has>[0]) => columns.visible.has(id);

  const byType = ACTIVITY_TYPES.map((t) => ({
    type: t,
    count: entries.filter((e) => e.activity_type === t).length,
  }));
  const withReflection = entries.filter((e) => e.notes && e.notes.trim() !== "").length;

  return (
    <main className="container print-doc stack">
      <div className="page-head no-print">
        <div>
          <h1>CPD record for sampling</h1>
          <p>
            Your development over the last twelve months, in the shape your institution asks for if
            you are selected for the annual sample. Print or save as PDF.
          </p>
        </div>
        <PrintButton />
      </div>

      {!isEngineeringBody(user.regulator) && (
        <div className="notice notice--warn no-print">
          <p className="small">
            Your profile isn&rsquo;t set to an engineering institution, so this may not be the
            right document for you. <Link href="/profile">Change your registering body</Link> if
            that&rsquo;s wrong.
          </p>
        </div>
      )}

      <div className="notice notice--info no-print">
        <p className="small">
          <strong>There is no hours or points target to hit.</strong> The Engineering Council
          argues against measuring development by input, and {body} asks what you got from your
          activity rather than how long it took. Hours are included below because they are
          sometimes useful context — untick them if you would rather they weren&rsquo;t there.
        </p>
      </div>

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
          Defaults to twelve months, which is what the sample asks you to confirm.
        </p>
        {chosen?.map((c) => (
          <input key={c} type="hidden" name="cols" value={c} />
        ))}
      </form>

      <PackColumnsForm selection={columns} hiddenFields={{ from, to }} />

      <div className="card">
        <h1>Continuing professional development record</h1>
        <p className="doc-meta">
          {user.full_name}
          {user.profession ? ` — ${user.profession}` : ""}
          {user.registration_number ? ` — ${body} ${user.registration_number}` : ""}
          <br />
          Period: {formatDate(from)} to {formatDate(to)} · Generated{" "}
          {formatDate(new Date().toISOString().slice(0, 10))} by CPD Register
        </p>

        <h2>Summary</h2>
        <p className="muted small">
          {entries.length} activities, {withReflection} of them with a written reflection. Range of
          development across the period:
        </p>
        <table className="table">
          <tbody>
            {byType.map((row) => (
              <tr key={row.type}>
                <td className="col--code">{row.type}</td>
                <td>
                  <strong>{row.count}</strong> {row.count === 1 ? "activity" : "activities"}
                  {row.count === 0 && <span className="muted small"> — none recorded</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                  {show("reflection") && <th>What you got from it</th>}
                  {show("cpd") && <th>Hours</th>}
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
                      <td className="small">{e.notes ? <EntryNotes notes={e.notes} /> : "—"}</td>
                    )}
                    {show("cpd") && (
                      <td className="small">{e.hours != null ? `${e.hours} h` : "—"}</td>
                    )}
                    {show("evidence") && (
                      <td className="small">
                        {e.verified ? "Platform-verified attendance" : "Self-reported"}
                        {e.verification_code && (
                          <div className="mono">
                            {baseUrl}/verify/{e.verification_code}
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
      </div>

      <div className="card">
        <h2>Why this record exists</h2>
        <p className="small">
          The Engineering Council requires every licensed institution to sample at least 5% of its
          registered members each year and check that they are recording their development. Being
          selected is random, so the record needs to be current all year rather than assembled when
          asked. Taking part when selected is not optional, and repeatedly not engaging can cost
          professional registration.
        </p>
        <p className="muted small">
          Platform-verified entries were captured live on a register, timestamped server-side, each
          with a code that can be checked online. {body} assesses the record itself — this document
          presents it, it does not satisfy the requirement on your behalf.
        </p>
      </div>
    </main>
  );
}
