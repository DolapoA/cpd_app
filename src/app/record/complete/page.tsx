import Link from "next/link";
import { EntryNotes } from "@/components/entry-notes";
import { redirect } from "next/navigation";
import { getDb, type CpdEntry } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { frameworkFor } from "@/lib/standards";
import { gapsFor } from "@/lib/completeness";
import { countsTowardCpd } from "@/lib/registration";
import { GapForm } from "@/components/gap-form";

export const metadata = { title: "Finish your record — CPD Register" };

export default async function CompleteRecordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const framework = frameworkFor(user.regulator);
  const entries = await (await getDb())
    .prepare("SELECT * FROM cpd_entries WHERE user_id = ? ORDER BY activity_date DESC, id DESC")
    .all(user.id) as CpdEntry[];

  const incomplete = entries
    // Activities from before the user joined the register can never count, so
    // asking them to finish those would be busywork.
    .filter((entry) => countsTowardCpd(entry.activity_date, user.registration_date))
    .map((entry) => ({ entry, gaps: gapsFor(entry, framework) }))
    .filter((row) => row.gaps.length > 0);

  // One explanation per gap type, rather than repeating it on every card.
  const reasons = new Map<string, string>();
  for (const row of incomplete) {
    for (const gap of row.gaps) if (!reasons.has(gap.label)) reasons.set(gap.label, gap.why);
  }

  return (
    <main className="container stack">
      <div className="page-head">
        <div>
          <h1>Finish your record</h1>
          <p>
            {incomplete.length === 0
              ? "Nothing outstanding."
              : `${incomplete.length} ${incomplete.length === 1 ? "activity is" : "activities are"} incomplete. Your record works without these, but they’re what auditors look for.`}
          </p>
        </div>
        <Link href="/record" className="btn btn--secondary">
          Back to my record
        </Link>
      </div>

      {incomplete.length === 0 ? (
        <div className="notice notice--ok">
          <p>✓ Your record is complete.</p>
        </div>
      ) : (
        <>
          <div className="card">
            <h2>Why these matter</h2>
            <dl className="gap-reasons">
              {[...reasons.entries()].map(([label, why]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{why}</dd>
                </div>
              ))}
            </dl>
          </div>

          {incomplete.map(({ entry, gaps }) => (
            <div className="card" key={entry.id}>
              <h3>{entry.title}</h3>
              <p className="muted small">
                {formatDate(entry.activity_date)} · {entry.activity_type}
                {entry.provider ? ` · ${entry.provider}` : ""}
                {entry.verified ? " · captured on an attendance register" : ""}
              </p>
              <p>
                {gaps.map((gap) => (
                  <span className="badge badge--pending" key={gap.key}>
                    Needs {gap.label.toLowerCase()}
                  </span>
                ))}
              </p>
              {entry.notes && (
                <p className="muted small prewrap">
                  <EntryNotes notes={entry.notes} />
                </p>
              )}
              <GapForm entryId={entry.id} gaps={gaps} framework={framework} />
            </div>
          ))}
        </>
      )}
    </main>
  );
}
