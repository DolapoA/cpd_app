import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb, registerStatus, type Register } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const metadata = { title: "My registers — CPD Register" };

const STATUS_LABEL = { open: "Open", closed: "Closed", "not-open": "Not open yet" } as const;
const STATUS_CLASS = { open: "badge--open", closed: "badge--closed", "not-open": "badge--pending" } as const;

export default async function RegistersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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
        <Link href="/registers/new" className="btn">
          New register
        </Link>
      </div>

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
