import Link from "next/link";
import { EntryNotes } from "@/components/entry-notes";
import { getDb, type CpdEntry } from "@/lib/db";
import { requireConfirmedUser } from "@/lib/auth";
import {
  ACTIVITY_TYPES,
  formatDate,
  GMC_APPRAISAL_REGULATOR,
  GTCS_UPDATE_REGULATOR,
  HCPC_AUDIT_PACK_REGULATOR,
  isEngineeringBody,
} from "@/lib/format";
import { frameworkFor, parseStandards } from "@/lib/standards";
import { gapsFor } from "@/lib/completeness";
import { countsTowardCpd, splitByRegistration } from "@/lib/registration";
import { StandardsBadges } from "@/components/standards-picker";
import { deleteEntry } from "@/lib/actions";

export const metadata = { title: "My CPD record — CPD Register" };

type EntryRow = CpdEntry & { verification_code: string | null };

type MonthGroup = {
  /** YYYY-MM, which sorts correctly as a string. */
  key: string;
  year: string;
  /** "August 2026". */
  label: string;
  entries: EntryRow[];
  points: number;
  hours: number;
};

/**
 * The record, cut into months.
 *
 * A record is meant to be kept for years, and a page that renders every one of
 * them at once is a page nobody scrolls to the bottom of. Folded by month, the
 * whole history is two taps away and none of it is in the way.
 *
 * Entries arrive newest first and stay that way, so the groups do too.
 */
function byMonth(entries: EntryRow[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  for (const entry of entries) {
    const key = entry.activity_date.slice(0, 7);
    let group = groups.get(key);
    if (!group) {
      // Parsed as UTC: a date-only string read as local time lands in the
      // previous month for anyone west of Greenwich.
      const label = new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
      group = { key, year: key.slice(0, 4), label, entries: [], points: 0, hours: 0 };
      groups.set(key, group);
    }
    group.entries.push(entry);
    group.points += entry.points ?? 0;
    group.hours += entry.hours ?? 0;
  }
  return [...groups.values()];
}

/** "3 entries · 12 points · 8 hours", with the empty parts left out. */
function groupSummary(group: MonthGroup): string {
  return [
    `${group.entries.length} ${group.entries.length === 1 ? "entry" : "entries"}`,
    group.points > 0 ? `${Math.round(group.points * 10) / 10} points` : null,
    group.hours > 0 ? `${Math.round(group.hours * 10) / 10} hours` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default async function RecordPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string }>;
}) {
  const user = await requireConfirmedUser();
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

  // At most one of these ever applies, so it is one link rather than four
  // conditionals sitting in the middle of the layout.
  const pack =
    user.regulator === HCPC_AUDIT_PACK_REGULATOR
      ? { href: "/record/audit-pack", label: "HCPC audit pack" }
      : user.regulator === GTCS_UPDATE_REGULATOR
        ? { href: "/record/professional-update", label: "Professional Update record" }
        : isEngineeringBody(user.regulator)
          ? { href: "/record/engineering", label: "CPD record for sampling" }
          : user.regulator === GMC_APPRAISAL_REGULATOR
            ? { href: "/record/appraisal", label: "GMC appraisal" }
            : null;

  const months = byMonth(entries);
  // Only the newest year is unfolded. A record that spans five years is mostly
  // history, and history is the part nobody scrolls through on purpose.
  const newestYear = months[0]?.year;

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
        {/* Two things people do often, and a drawer for the rest. Eight buttons
            wrapped onto three lines on a phone, which reads as a control panel
            rather than a record — and the two that matter were no easier to
            find for the six beside them. */}
        <div className="actions-row">
          <Link href="/record/new" className="btn">
            Log activity
          </Link>
          <Link href="/record/planned" className="btn btn--secondary">
            Planned CPD
          </Link>
          <details className="mini-menu">
            <summary className="btn btn--quiet">More</summary>
            <div className="mini-menu__body">
              {pack && (
                <Link href={pack.href} className="btn btn--quiet btn--small">
                  {pack.label}
                </Link>
              )}
              <Link href="/record/colleague-feedback" className="btn btn--quiet btn--small">
                Colleague feedback
              </Link>
              <Link href="/record/import" className="btn btn--quiet btn--small">
                Import spreadsheet
              </Link>
              <a href="/record/export" className="btn btn--quiet btn--small">
                Export CSV
              </a>
            </div>
          </details>
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
                className={`badge ${has ? "badge--verified" : "badge--neutral"}`}
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
        <div className="stack stack--tight">
          {months.map((group) => (
            <details
              key={group.key}
              className="card card--flush month"
              open={group.year === newestYear}
            >
              <summary className="month__head">
                <span className="month__label">{group.label}</span>
                <span className="muted small">{groupSummary(group)}</span>
              </summary>
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
                    {group.entries.map((e) => {
                      const counts = countsTowardCpd(e.activity_date, user.registration_date);
                      return (
                        <tr key={e.id} className={counts ? undefined : "row--precede"}>
                          <td data-label="Date">
                            {formatDate(e.activity_date)}
                            {!counts && (
                              <div>
                                <span
                                  className="badge badge--nonofficial"
                                  title="Before your registration date, so it can’t count"
                                >
                                  Pre-registration
                                </span>
                              </div>
                            )}
                          </td>
                          <td data-label=".">
                            <strong>{e.title}</strong>
                            {e.provider && <div className="muted small">{e.provider}</div>}
                            {e.notes && <EntryNotes notes={e.notes} className="muted small" />}
                          </td>
                          <td className="small" data-label="Type">
                            {e.activity_type}
                          </td>
                          {framework && (
                            <td className="small" data-label={framework.columnHeader}>
                              <StandardsBadges
                                framework={framework}
                                codes={parseStandards(e.standards)}
                              />
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
                          <td className="col--actions" data-label=".">
                            {/* Deleting is asked twice. A record is kept for
                                years and this is the one control on the page
                                that destroys part of it, so a mis-tap on a
                                phone must not be enough. */}
                            {!e.verified && (
                              <details className="mini-menu">
                                <summary className="btn btn--quiet btn--small">Delete</summary>
                                <div className="mini-menu__body confirm">
                                  <p className="small">
                                    Delete <strong>{e.title}</strong>? This cannot be undone.
                                  </p>
                                  <form action={deleteEntry}>
                                    <input type="hidden" name="entry_id" value={e.id} />
                                    <button type="submit" className="btn btn--danger btn--small">
                                      Yes, delete it
                                    </button>
                                  </form>
                                </div>
                              </details>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      )}

      <p className="muted small">
        Platform-verified entries are captured live on a register and can&rsquo;t be edited or
        deleted
      </p>
    </main>
  );
}
