import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, type FeedbackResponse, type Register } from "@/lib/db";
import { requireConfirmedUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { FEEDBACK_QUESTIONS, SCALE_POINTS, SMALL_SAMPLE_CAUTION } from "@/lib/feedback";

export const metadata = { title: "Event feedback — CPD Register" };

export default async function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireConfirmedUser();

  const { id } = await params;
  const db = await getDb();
  const reg = await db.prepare("SELECT * FROM registers WHERE id = ?").get(Number(id)) as
    | Register
    | undefined;
  if (!reg || reg.organiser_id !== user.id) notFound();

  const responses = await db
    .prepare("SELECT * FROM feedback_responses WHERE register_id = ? ORDER BY id ASC")
    .all(reg.id) as FeedbackResponse[];

  const smallSample = responses.length > 0 && responses.length < SMALL_SAMPLE_CAUTION;

  const summary = FEEDBACK_QUESTIONS.map((question) => {
    const values = responses.map((r) => r[question.key]);
    const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const distribution = question.labels.map(
      (_, i) => values.filter((v) => v === i + 1).length
    );
    return { question, mean, distribution };
  });

  const learning = summary.filter((s) => s.question.group === "learning");
  const learningValue = learning.reduce((sum, s) => sum + s.mean, 0) / learning.length;
  const comments = responses.filter((r) => r.comments && r.comments.trim() !== "");

  return (
    <main className="container stack">
      <div className="page-head">
        <div>
          <h1>Feedback</h1>
          <p>
            {reg.title} · {formatDate(reg.event_date)}
          </p>
        </div>
        <div className="actions-row">
          <Link href={`/registers/${reg.id}`} className="btn btn--secondary">
            Back to register
          </Link>
          {responses.length > 0 && (
            <a href={`/registers/${reg.id}/feedback/export`} className="btn btn--secondary">
              Export CSV
            </a>
          )}
        </div>
      </div>

      {!reg.feedback_enabled && (
        <div className="notice notice--warn">
          <p className="small">
            Feedback is switched off for this event, so attendees aren&rsquo;t asked.
          </p>
        </div>
      )}

      {smallSample && (
        <div className="notice notice--warn">
          <p className="small">
            <strong>
              Only {responses.length} response{responses.length === 1 ? "" : "s"}.
            </strong>{" "}
            Treat these as indicative, not representative. With this few replies a comment can be
            traceable from its content — please don&rsquo;t try to work out who wrote what.
          </p>
        </div>
      )}

      {responses.length === 0 ? (
        <div className="card">
          <p className="muted">
            No feedback yet. Attendees are asked right after signing; replies appear here
            straight away.
          </p>
        </div>
      ) : (
        <>
          <div className="grid-4">
            <div className="stat">
              <div className="stat__value">{responses.length}</div>
              <div className="stat__label">Responses</div>
            </div>
            <div className="stat">
              <div className="stat__value">
                {learningValue.toFixed(1)}
                <span className="stat__unit"> / {SCALE_POINTS}</span>
              </div>
              <div className="stat__label">Learning value (relevance, gain, intent)</div>
            </div>
            <div className="stat">
              <div className="stat__value">
                {summary[3].mean.toFixed(1)}
                <span className="stat__unit"> / {SCALE_POINTS}</span>
              </div>
              <div className="stat__label">Delivery</div>
            </div>
            <div className="stat">
              <div className="stat__value">
                {Math.round(
                  (responses.filter((r) => r.q5 >= 4).length / responses.length) * 100
                )}
                %
              </div>
              <div className="stat__label">Would recommend to a colleague</div>
            </div>
          </div>

          <div className="card">
            <h2>Question by question</h2>
            <p className="muted small">
              Each question has its own 1&ndash;{SCALE_POINTS} scale. &ldquo;Perceived learning
              gain&rdquo; is what attendees felt they gained — a self-report, not a measurement.
            </p>
            <div className="table-wrap">
              <table className="table table--stack">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th className="col--bar">Average</th>
                    <th>Spread (low → high)</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map(({ question, mean, distribution }) => (
                    <tr key={question.key}>
                      <td data-label=".">
                        <strong>{question.short}</strong>
                        <div className="muted small">{question.text}</div>
                      </td>
                      <td data-label="Average">
                        <div className="fb-bar">
                          <span className="fb-bar__track">
                            <span
                              className="fb-bar__fill"
                              style={
                                {
                                  "--fill": `${(mean / SCALE_POINTS) * 100}%`,
                                } as React.CSSProperties
                              }
                            />
                          </span>
                          <strong>{mean.toFixed(1)}</strong>
                        </div>
                      </td>
                      <td className="small muted" data-label="Spread">{distribution.join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2>Comments</h2>
            {comments.length === 0 ? (
              <p className="muted small">
                No written comments — the comment box is optional.
              </p>
            ) : (
              comments.map((r) => (
                <blockquote className="fb-comment" key={r.id}>
                  <p>{r.comments}</p>
                </blockquote>
              ))
            )}
          </div>
        </>
      )}

      <p className="muted small">
        Responses aren&rsquo;t linked to the attendee who gave them, so they can&rsquo;t be
        attributed by anyone — including us. Only the date is kept, not the time.
      </p>
    </main>
  );
}
