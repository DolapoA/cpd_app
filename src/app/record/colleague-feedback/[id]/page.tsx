import Link from "next/link";
import { notFound } from "next/navigation";
import { requireConfirmedUser } from "@/lib/auth";
import { getDb, type MsfRequest, type MsfResponse } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { sendMsfReminder } from "@/lib/actions";
import { canRemind, daysBetween, msfStatus, ukToday } from "@/lib/msf-invites";
import {
  MSF_RATED_QUESTIONS,
  MSF_SCALE_LABELS,
  MSF_SCALE_POINTS,
  MSF_SMALL_SAMPLE,
  MSF_TEXT_QUESTIONS,
  commentOrder,
  renderMsfQuestion,
  summariseMsfItem,
} from "@/lib/msf";

export const metadata = { title: "Your colleague feedback — CPD Register" };

export default async function ColleagueFeedbackDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string; reminded?: string }>;
}) {
  const user = await requireConfirmedUser();
  const { id } = await params;
  const { sent, reminded } = await searchParams;

  const db = await getDb();
  const request = (await db
    .prepare("SELECT * FROM msf_requests WHERE id = ? AND user_id = ?")
    .get(Number(id), user.id)) as MsfRequest | undefined;
  if (!request) notFound();

  const tally = (await db
    .prepare(
      `SELECT COUNT(*) AS asked,
              COALESCE(SUM(responded), 0) AS replied,
              COUNT(declined_at) AS declined
         FROM msf_invitations WHERE request_id = ?`
    )
    .get(request.id)) as { asked: string; replied: string; declined: string };
  const asked = Number(tally.asked);
  const replied = Number(tally.replied);
  const declined = Number(tally.declined);

  const closed = msfStatus(request) === "closed";
  const daysLeft = daysBetween(ukToday(), request.closes_on);
  const captions = {
    name: request.subject_name,
    word: request.subject_word,
    comparedTo: request.compared_to,
  };

  // Only fetched once the window has closed: there is no code path that reads
  // an answer while colleagues can still be nudged.
  const responses = closed
    ? ((await db
        .prepare("SELECT * FROM msf_responses WHERE request_id = ?")
        .all(request.id)) as MsfResponse[])
    : [];

  const summary = MSF_RATED_QUESTIONS.map((question) =>
    summariseMsfItem(
      question,
      responses.map((r) => Number(r[question.key as `q${number}`] ?? 0))
    )
  );

  return (
    <main className="container stack">
      <div className="page-head">
        <div>
          <h1>Colleague feedback</h1>
          <p>
            Opened {formatDate(request.opened_on)} &middot; closes {formatDate(request.closes_on)}
            {" "}&middot; <Link href="/record/colleague-feedback">All rounds</Link>
          </p>
        </div>
      </div>

      {sent === "1" && (
        <div className="notice notice--ok">
          <p className="small">
            Invitations sent to {asked} colleagues. You will see the replies after{" "}
            {formatDate(request.closes_on)}.
          </p>
        </div>
      )}
      {reminded === "1" && (
        <div className="notice notice--ok">
          <p className="small">Reminder sent to everyone who has not replied.</p>
        </div>
      )}

      <div className="grid-4">
        <div className="stat">
          <div className="stat__value">{asked}</div>
          <div className="stat__label">Colleagues asked</div>
        </div>
        <div className="stat">
          <div className="stat__value">{replied}</div>
          <div className="stat__label">Replied</div>
        </div>
        <div className="stat">
          <div className="stat__value">{declined}</div>
          <div className="stat__label">Declined</div>
        </div>
        <div className="stat">
          <div className="stat__value">{closed ? 0 : Math.max(0, daysLeft)}</div>
          <div className="stat__label">{closed ? "Closed" : "Days left"}</div>
        </div>
      </div>

      {!closed && (
        <div className="card stack">
          <h2>Still open</h2>
          {/* Counts, never names. Putting a colleague's address beside "hasn't
              replied" would be the strongest hint anyone could be given about
              who said what once the answers arrive. */}
          <p className="muted small">
            Nothing is shown until {formatDate(request.closes_on)}, including to you. We tell you
            how many people have replied and never which &mdash; that is what lets your
            colleagues answer candidly.
          </p>
          {canRemind(request) ? (
            <form action={sendMsfReminder}>
              <input type="hidden" name="request_id" value={request.id} />
              <button type="submit" className="btn btn--secondary">
                Remind the {asked - replied - declined} who haven&rsquo;t replied
              </button>
            </form>
          ) : (
            <p className="hint">
              {request.reminded_on
                ? `Reminder sent ${formatDate(request.reminded_on)}. That is the only one — beyond that it is chasing.`
                : `You can send one reminder from ${formatDate(request.opened_on)} plus 7 days.`}
            </p>
          )}
        </div>
      )}

      {closed && responses.length === 0 && (
        <div className="card empty">
          <p className="empty__title">Nobody replied</p>
          <p>
            The window closed with no answers. Colleagues are busy and this asks a real favour of
            them &mdash; it is worth asking again, in person first.
          </p>
        </div>
      )}

      {closed && responses.length > 0 && (
        <>
          {responses.length < MSF_SMALL_SAMPLE && (
            <div className="notice notice--warn">
              <p className="small">
                <strong>Only {responses.length} replies.</strong> Treat these as indicative rather
                than representative &mdash; and with this few, a written answer can be traceable
                from its wording. Please don&rsquo;t try to work out who wrote what.
              </p>
            </div>
          )}

          <div className="card card--flush">
            <div className="table-wrap">
              <table className="table table--stack">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th className="col--bar">Average</th>
                    <th>Spread (low &rarr; high)</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((item) => (
                    <tr key={item.question.key}>
                      <td data-label=".">
                        {renderMsfQuestion(item.question.template, captions)}
                        {item.abstained > 0 && (
                          <div className="muted small">
                            {item.abstained} could not comment
                          </div>
                        )}
                      </td>
                      <td data-label="Average" className="col--bar">
                        {item.mean === null ? (
                          <span className="muted small">No one felt able to say</span>
                        ) : (
                          <div className="fb-bar">
                            <span className="fb-bar__track">
                              <i
                                className="fb-bar__fill"
                                style={{ ["--fill" as string]: `${(item.mean / MSF_SCALE_POINTS) * 100}%` }}
                              />
                            </span>
                            <span className="small">{item.mean.toFixed(1)}</span>
                          </div>
                        )}
                      </td>
                      <td data-label="Spread" className="small">
                        {item.rated > 0 ? item.distribution.join(" · ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {MSF_TEXT_QUESTIONS.map((question) => {
            // Sorted by a hash of the text, not by row id: arrival order is
            // one of the few threads left that could lead back to a person.
            const written = responses
              .map((r) => String(r[question.key as `q${number}`] ?? "").trim())
              .filter(Boolean)
              .sort((a, b) => commentOrder(a) - commentOrder(b));
            return (
              <div className="card" key={question.key}>
                <h2>{renderMsfQuestion(question.template, captions)}</h2>
                {written.length === 0 ? (
                  <p className="muted small">Nobody wrote anything here.</p>
                ) : (
                  written.map((text, i) => (
                    <blockquote className="fb-comment" key={i}>
                      <p>{text}</p>
                    </blockquote>
                  ))
                )}
              </div>
            );
          })}

          <p className="muted small">
            Rated against &ldquo;{request.compared_to}&rdquo;. Scale:{" "}
            {MSF_SCALE_LABELS.map((l, i) => `${i + 1} ${l.toLowerCase()}`).join(" · ")}. Replies
            are not linked to the colleague who gave them, so they cannot be attributed by anyone
            &mdash; including us.
          </p>
        </>
      )}
    </main>
  );
}
