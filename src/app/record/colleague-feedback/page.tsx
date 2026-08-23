import Link from "next/link";
import { requireConfirmedUser } from "@/lib/auth";
import { getDb, type MsfRequest } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { msfStatus, ukToday, daysBetween, visibleReplyCount } from "@/lib/msf-invites";

export const metadata = { title: "Colleague feedback — CPD Register" };

export default async function ColleagueFeedbackPage() {
  const user = await requireConfirmedUser();
  const db = await getDb();

  const rounds = (await db
    .prepare("SELECT * FROM msf_requests WHERE user_id = ? ORDER BY opened_on DESC, id DESC")
    .all(user.id)) as MsfRequest[];

  const counts = new Map<number, { asked: number; replied: number | null }>();
  for (const round of rounds) {
    const row = (await db
      .prepare("SELECT COUNT(*) AS asked FROM msf_invitations WHERE request_id = ?")
      .get(round.id)) as { asked: string };
    counts.set(round.id, { asked: Number(row.asked), replied: await visibleReplyCount(round) });
  }

  const open = rounds.find((r) => msfStatus(r) === "open");

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Colleague feedback</h1>
          <p>What colleagues make of how you practise.</p>
        </div>
      </div>

      {rounds.length === 0 ? (
        <div className="card empty">
          <div className="empty__icon" aria-hidden="true">◎</div>
          <p className="empty__title">Nothing asked yet</p>
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
                  const status = msfStatus(round);
                  const left = round.closes_on ? daysBetween(ukToday(), round.closes_on) : null;
                  return (
                    <tr key={round.id}>
                      <td data-label=".">
                        <Link href={`/record/colleague-feedback/${round.id}`}>
                          <strong>{round.reference ?? `Round ${round.id}`}</strong>
                        </Link>
                        <div className="muted small">
                          {round.opened_on
                            ? `Opened ${formatDate(round.opened_on)}${c.replied === null ? "" : ` · ${c.replied} of ${c.asked} replied`}`
                            : "No raters invited yet"}
                        </div>
                      </td>
                      <td data-label="Status">
                        {status === "closed" ? (
                          <span className="badge badge--verified">Results ready</span>
                        ) : status === "draft" ? (
                          <span className="badge badge--neutral">Draft</span>
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

      {rounds.length > 0 && !open && (
        <div className="actions-row">
          <Link href="/record/colleague-feedback/new" className="btn">
            Ask for feedback
          </Link>
        </div>
      )}
    </main>
  );
}
