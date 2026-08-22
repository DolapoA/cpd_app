import Link from "next/link";
import { getDb, registerStatus, type Register } from "@/lib/db";
import { requireConfirmedUser } from "@/lib/auth";
import { isOrganiserPlan } from "@/lib/entitlements";
import { formatDate } from "@/lib/format";

export const metadata = { title: "My registers — CPD Register" };

const STATUS_LABEL = { open: "Open", closed: "Closed", "not-open": "Not open yet" } as const;
const STATUS_CLASS = { open: "badge--open", closed: "badge--closed", "not-open": "badge--neutral" } as const;

export default async function RegistersPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const user = await requireConfirmedUser();
  const { upgraded } = await searchParams;

  const db = await getDb();
  const registers = await db
    .prepare(
      `SELECT r.*, (SELECT COUNT(*) FROM signatures s WHERE s.register_id = r.id AND s.voided = 0) AS signature_count
       FROM registers r WHERE r.organiser_id = ? ORDER BY r.event_date DESC, r.id DESC`
    )
    .all(user.id) as (Register & { signature_count: number })[];

  return (
    <main className="container stack">
      <div className="page-head">
        <div>
          <h1>My registers</h1>
          <p>Attendance registers for events you organise.</p>
        </div>
        <div className="actions-row">
          <Link href="/registers/new" className="btn">
            New register
          </Link>
          {isOrganiserPlan(user) && (
            <>
              <Link href="/registers/trends" className="btn btn--quiet">
                Feedback trends
              </Link>
              <Link href="/registers/branding" className="btn btn--quiet">
                Branding
              </Link>
            </>
          )}
        </div>
      </div>

      {upgraded === "1" && (
        <div className="notice notice--ok">
          <p className="small">
            Organiser features are on. Add your logo from <strong>Branding</strong>, and the next
            register you create can ask extra questions at sign-in.
          </p>
        </div>
      )}

      {registers.length === 0 ? (
        <div className="card empty">
          <div className="empty__icon" aria-hidden="true">▣</div>
          <p className="empty__title">No registers yet</p>
          <p>
            A register takes a minute to set up. Put the QR on your closing slide and attendees
            sign on their phones — no account needed, and you can watch signatures arrive live.
          </p>
          <div className="actions-row">
            <Link href="/registers/new" className="btn">
              Create your first register
            </Link>
          </div>
        </div>
      ) : (
        <div className="card card--flush">
          <div className="table-wrap">
            <table className="table table--stack">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>CPD</th>
                  <th>Signatures</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {registers.map((r) => {
                  const status = registerStatus(r);
                  return (
                    <tr key={r.id}>
                      <td data-label=".">
                        <Link href={`/registers/${r.id}`}>{r.title}</Link>
                      </td>
                      <td data-label="Date">{formatDate(r.event_date)}</td>
                      <td data-label="Type">{r.event_type}</td>
                      <td data-label="CPD">
                        {r.is_official ? (
                          <span className="badge badge--official">
                            Official · {r.points} pts ({r.accrediting_body})
                          </span>
                        ) : (
                          <span className="badge badge--nonofficial">Unofficial</span>
                        )}
                      </td>
                      <td data-label="Signatures">{r.signature_count}</td>
                      <td data-label="Status">
                        <span className={`badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
