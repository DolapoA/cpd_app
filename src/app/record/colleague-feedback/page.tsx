import Link from "next/link";
import { requireConfirmedUser } from "@/lib/auth";
import { getDb, type MsfRequest } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { msfStatus, ukToday, daysBetween } from "@/lib/msf-invites";

export const metadata = { title: "Colleague feedback — CPD Register" };

export default async function ColleagueFeedbackPage() {
  const user = await requireConfirmedUser();
  const db = await getDb();

  const rounds = (await db
    .prepare("SELECT * FROM msf_requests WHERE user_id = ? ORDER BY opened_on DESC, id DESC")
    .all(user.id)) as MsfRequest[];

  const counts = new Map<number, { asked: number; replied: number }>();
  for (const round of rounds) {
    const row = (await db
      .prepare(
        `SELECT COUNT(*) AS asked, COALESCE(SUM(responded), 0) AS replied
           FROM msf_invitations WHERE request_id = ?`
      )
      .get(round.id)) as { asked: string; replied: string };
    counts.set(round.id, { asked: Number(row.asked), replied: Number(row.replied) });
  }

  const open = rounds.find((r) => msfStatus(r) === "open");

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Colleague feedback</h1>
          <p>
            What the people you work with make of how you practise.{" "}
            <Link href="/record">Back to your record</Link>
          </p>
        </div>
        {!open && (
          <Link href="/record/colleague-feedback/new" className="btn">
            Ask for feedback
          </Link>
        )}
      </div>

      {rounds.length === 0 ? (
        <div className="card empty">
          <div className="empty__icon" aria-hidden="true">◎</div>
          <p className="empty__title">Nothing asked yet</p>
          <p>
            You name colleagues by email; each gets their own private link and answers twenty
            questions anonymously. Their replies are pooled and shown to you three weeks later.
          </p>
          <div className="actions-row">
            <Link href="/record/colleague-feedback/new" className="btn">
              Ask for feedback
            </Link>
          </div>
        </div>
      ) : (
        <div className="card card--flush">
          <div className="table-wrap">
            <table className="table table--stack">
              <tbody>
                {rounds.map((round) => {
                  const c = counts.get(round.id) ?? { asked: 0, replied: 0 };
                  const closed = msfStatus(round) === "closed";
                  const left = daysBetween(ukToday(), round.closes_on);
                  return (
                    <tr key={round.id}>
                      <td data-label=".">
                        <Link href={`/record/colleague-feedback/${round.id}`}>
                          <strong>Opened {formatDate(round.opened_on)}</strong>
                        </Link>
                        <div className="muted small">
                          {c.replied} of {c.asked} replied
                        </div>
                      </td>
                      <td data-label="Status">
                        {closed ? (
                          <span className="badge badge--verified">Results ready</span>
                        ) : (
                          <span className="badge badge--neutral">
                            {left} {left === 1 ? "day" : "days"} left
                          </span>
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
    </main>
  );
}
