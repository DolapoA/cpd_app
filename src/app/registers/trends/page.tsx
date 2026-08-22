import Link from "next/link";
import { notFound } from "next/navigation";
import { requireConfirmedUser } from "@/lib/auth";
import { getDb, type Register } from "@/lib/db";
import { isOrganiserPlan } from "@/lib/entitlements";
import { formatDate } from "@/lib/format";
import { FEEDBACK_QUESTIONS } from "@/lib/feedback";

export const metadata = { title: "Feedback trends — CPD Register" };

type Row = Register & { responses: string; q1: string; q2: string; q3: string; q4: string; q5: string };

export default async function TrendsPage() {
  const user = await requireConfirmedUser();
  if (!isOrganiserPlan(user)) notFound();

  // One query: every register with its response count and per-question means.
  const rows = (await (await getDb())
    .prepare(
      `SELECT r.*, COUNT(f.id) AS responses,
              AVG(f.q1) AS q1, AVG(f.q2) AS q2, AVG(f.q3) AS q3, AVG(f.q4) AS q4, AVG(f.q5) AS q5
         FROM registers r
         LEFT JOIN feedback_responses f ON f.register_id = r.id
        WHERE r.organiser_id = ?
        GROUP BY r.id
        ORDER BY r.event_date ASC, r.id ASC`
    )
    .all(user.id)) as Row[];

  const withFeedback = rows.filter((r) => Number(r.responses) > 0);
  const totalResponses = withFeedback.reduce((sum, r) => sum + Number(r.responses), 0);

  // The across-everything mean per question, weighted by responses.
  const overall = FEEDBACK_QUESTIONS.map((q) => {
    const total = withFeedback.reduce(
      (sum, r) => sum + Number(r[q.key] ?? 0) * Number(r.responses),
      0
    );
    return { question: q, mean: totalResponses ? total / totalResponses : 0 };
  });

  return (
    <main className="container stack">
      <div className="page-head">
        <div>
          <h1>Feedback trends</h1>
          <p>
            Every event side by side, so a change reads as a change.{" "}
            <Link href="/registers">Back to your registers</Link>
          </p>
        </div>
      </div>

      {withFeedback.length === 0 ? (
        <div className="card empty">
          <p className="empty__title">No feedback yet</p>
          <p>
            Trends appear once events with feedback collection have replies. Turn on
            &ldquo;ask attendees for feedback&rdquo; when creating a register.
          </p>
        </div>
      ) : (
        <>
          <div className="card stack">
            <h2>Across all your events</h2>
            <p className="muted small">
              {totalResponses} {totalResponses === 1 ? "reply" : "replies"} over{" "}
              {withFeedback.length} {withFeedback.length === 1 ? "event" : "events"}.
            </p>
            <table className="table">
              <tbody>
                {overall.map(({ question, mean }) => (
                  <tr key={question.key}>
                    <td>{question.short}</td>
                    <td className="trend-bar-cell">
                      <div className="trend-bar" aria-hidden="true">
                        <i style={{ width: `${(mean / 5) * 100}%` }} />
                      </div>
                    </td>
                    <td className="small" style={{ whiteSpace: "nowrap" }}>
                      {mean.toFixed(1)} / 5
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card card--flush">
            <div className="table-wrap">
              <table className="table table--stack">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Replies</th>
                    {FEEDBACK_QUESTIONS.map((q) => (
                      <th key={q.key}>{q.short}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {withFeedback.map((r) => (
                    <tr key={r.id}>
                      <td data-label=".">
                        <Link href={`/registers/${r.id}/feedback`}>
                          <strong>{r.title}</strong>
                        </Link>
                        <div className="muted small">{formatDate(r.event_date)}</div>
                      </td>
                      <td data-label="Replies">{Number(r.responses)}</td>
                      {FEEDBACK_QUESTIONS.map((q) => (
                        <td key={q.key} data-label={q.short} className="small">
                          {Number(r[q.key]).toFixed(1)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
