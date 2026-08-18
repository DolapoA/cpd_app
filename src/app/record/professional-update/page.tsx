import Link from "next/link";
import { EntryNotes } from "@/components/entry-notes";
import { PrintButton } from "@/components/print-button";
import { PackColumnsForm } from "@/components/pack-columns-form";
import { getDb, type CpdEntry } from "@/lib/db";
import { requireConfirmedUser } from "@/lib/auth";
import { record } from "@/lib/analytics";
import { ACTIVITY_TYPES, formatDate, GTCS_UPDATE_REGULATOR } from "@/lib/format";
import { frameworkFor, parseStandards } from "@/lib/standards";
import { clampToRegistration } from "@/lib/registration";
import { getBaseUrl } from "@/lib/base-url";
import { resolvePackColumns } from "@/lib/pack-columns";

export const metadata = { title: "Professional Update record — CPD Register" };

export default async function ProfessionalUpdatePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; cols?: string | string[] }>;
}) {
  const user = await requireConfirmedUser();
  await record({ name: "compliance_pack_generated", kind: "gtcs" });

  const sp = await searchParams;
  const to = sp.to ?? new Date().toISOString().slice(0, 10);
  // Professional Update is confirmed every five years, not every two.
  const requestedFrom =
    sp.from ??
    new Date(new Date(to + "T00:00:00").getTime() - 5 * 365 * 24 * 60 * 60 * 1000)
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
  const columns = resolvePackColumns("gtcs", framework, user.regulator ?? "GTCS", chosen);
  const show = (id: Parameters<typeof columns.visible.has>[0]) => columns.visible.has(id);

  const byType = ACTIVITY_TYPES.map((t) => ({
    type: t,
    count: entries.filter((e) => e.activity_type === t).length,
  }));
  const totalHours = entries.reduce((sum, e) => sum + (e.hours ?? 0), 0);
  const withReflection = entries.filter((e) => e.notes && e.notes.trim() !== "").length;

  return (
    <main className="container print-doc stack">
      <div className="page-head no-print">
        <div>
          <h1>Professional Update record</h1>
          <p>
            Your professional learning for the period, laid out for the reflective record
            Professional Update asks you to keep. Adjust the period, then print or save as PDF.
          </p>
        </div>
        <PrintButton />
      </div>

      {user.regulator !== GTCS_UPDATE_REGULATOR && (
        <div className="notice notice--warn no-print">
          <p className="small">
            Your profile isn&rsquo;t set to GTCS, so this may not be the right document for you.{" "}
            <Link href="/profile">Change your registering body</Link> if that&rsquo;s wrong.
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
          Defaults to five years — the Professional Update cycle. Your annual PRD discussion will
          usually want a single year instead.
        </p>
        {chosen?.map((c) => (
          <input key={c} type="hidden" name="cols" value={c} />
        ))}
      </form>

      <PackColumnsForm selection={columns} hiddenFields={{ from, to }} />

      <div className="card">
        <h1>Record of professional learning</h1>
        <p className="doc-meta">
          {user.full_name}
          {user.profession ? ` — ${user.profession}` : ""}
          {user.registration_number ? ` — GTCS registration ${user.registration_number}` : ""}
          <br />
          Period: {formatDate(from)} to {formatDate(to)} · Generated{" "}
          {formatDate(new Date().toISOString().slice(0, 10))} by CPD Register
        </p>

        <h2>Summary</h2>
        <p className="muted small">
          {entries.length} activities · {totalHours} learning hours · {withReflection} carrying a
          written reflection. Range of learning across the period:
        </p>
        <table className="table table--stack">
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
            <table className="table table--stack">
              <thead>
                <tr>
                  {show("date") && <th>Date</th>}
                  {show("activity") && <th>Activity</th>}
                  {show("provider") && <th>Provider</th>}
                  {show("type") && <th>Type</th>}
                  {show("standards") && framework && <th>{framework.columnHeader}</th>}
                  {show("reflection") && <th>Reflection and impact</th>}
                  {show("cpd") && <th>Hours</th>}
                  {show("evidence") && <th>Evidence</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    {show("date") && <td data-label="Date">{formatDate(e.activity_date)}</td>}
                    {show("activity") && (<td data-label=".">
                        <strong>{e.title}</strong>
                      </td>
                    )}
                    {show("provider") && <td className="small" data-label="Provider">{e.provider ?? "—"}</td>}
                    {show("type") && <td className="small" data-label="Type">{e.activity_type}</td>}
                    {show("standards") && framework && (
                      <td className="small" data-label={framework.columnHeader}>{parseStandards(e.standards).join(", ") || "—"}</td>
                    )}
                    {show("reflection") && (<td className="small" data-label="Reflection">{e.notes ? <EntryNotes notes={e.notes} /> : "—"}</td>
                    )}
                    {show("cpd") && (<td className="small" data-label="CPD">{e.hours != null ? `${e.hours} h` : "—"}</td>
                    )}
                    {show("evidence") && (<td className="small" data-label="Evidence">
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
        <h2>What this covers, and what it doesn&rsquo;t</h2>
        <p className="small">
          Professional Update asks for engagement in professional learning, self-evaluation against
          the GTCS Professional Standards, a reflective record with evidence of impact, and
          engagement in Professional Review and Development — signed off by you and someone with
          managerial oversight every five years.
        </p>
        <p className="small">
          <strong>This document is the reflective record.</strong> Your self-evaluation against the
          Standards, your PRD discussions and the sign-off itself happen with your line manager and
          through MyGTCS. Bring this to those conversations rather than in place of them.
        </p>
        <p className="muted small">
          Platform-verified entries were captured live on a register, timestamped server-side, each
          with a code that can be checked online.
        </p>
      </div>
    </main>
  );
}
