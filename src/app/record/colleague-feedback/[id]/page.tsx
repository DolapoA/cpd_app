import Link from "next/link";
import { notFound } from "next/navigation";
import { requireConfirmedUser } from "@/lib/auth";
import { getDb, type MsfInvitation, type MsfRequest, type MsfResponse } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { addMsfRater, deleteMsfRequest, sendMsfReminder } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { MsfForm } from "@/components/msf-form";
import { canRemind, daysBetween, msfStatus, ukToday, visibleReplyCount } from "@/lib/msf-invites";
import {
  MSF_MIN_COLLEAGUES,
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
  searchParams: Promise<{ self?: string; reminded?: string }>;
}) {
  const user = await requireConfirmedUser();
  const { id } = await params;
  const { self, reminded } = await searchParams;

  const db = await getDb();
  const request = (await db
    .prepare("SELECT * FROM msf_requests WHERE id = ? AND user_id = ?")
    .get(Number(id), user.id)) as MsfRequest | undefined;
  if (!request) notFound();

  const invitations = (await db
    .prepare("SELECT * FROM msf_invitations WHERE request_id = ? ORDER BY id ASC")
    .all(request.id)) as MsfInvitation[];
  const asked = invitations.length;
  const replied = invitations.filter((i) => i.responded).length;
  const declined = invitations.filter((i) => i.declined_at).length;

  const selfDone = !!(await db
    .prepare("SELECT request_id FROM msf_self_assessments WHERE request_id = ?")
    .get(request.id));

  const status = msfStatus(request);
  // The count the subject may see: weekly checkpoints while open, live once
  // closed. A tally that moved the day after one colleague was nudged would
  // name them.
  const shownReplies = await visibleReplyCount(request);
  const daysLeft = request.closes_on ? daysBetween(ukToday(), request.closes_on) : null;

  // The results unseal only when the window has closed, the subject has done
  // the same exercise themselves, and enough people were asked for a reply
  // not to be traceable. All three are conditions, not suggestions.
  const enoughInvited = asked >= MSF_MIN_COLLEAGUES;
  const released = status === "closed" && selfDone && enoughInvited;

  const responses = released
    ? ((await db
        .prepare("SELECT * FROM msf_responses WHERE request_id = ?")
        .all(request.id)) as MsfResponse[])
    : [];
  const selfAnswers = released
    ? ((await db
        .prepare("SELECT * FROM msf_self_assessments WHERE request_id = ?")
        .get(request.id)) as Record<string, number | string | null> | undefined)
    : undefined;

  const captions = {
    name: request.subject_name,
    word: request.subject_word,
    comparedTo: request.compared_to,
  };
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
            <Link href="/record/colleague-feedback">All rounds</Link>
          </p>
        </div>
      </div>

      {self === "1" && (
        <div className="notice notice--ok">
          <p className="small">Self-assessment saved.</p>
        </div>
      )}
      {reminded === "1" && (
        <div className="notice notice--ok">
          <p className="small">Reminder sent to everyone who has not replied.</p>
        </div>
      )}

      {/* Reference · due date · self-assessment: the filing strip an
          appraisal system expects to see. */}
      <div className="grid-4 msf-strip">
        <div className="stat">
          <div className="stat__value mono msf-ref">{request.reference}</div>
          <div className="stat__label">Reference</div>
        </div>
        <div className="stat">
          <div className="stat__value">
            {request.closes_on ? formatDate(request.closes_on) : "Not set"}
          </div>
          <div className="stat__label">
            {request.closes_on ? "Due date" : "Set when your first rater is invited"}
          </div>
        </div>
        <div className="stat">
          <div className="stat__value">{shownReplies ?? "—"}</div>
          <div className="stat__label">
            {shownReplies === null
              ? "Responses — counted from day 7"
              : asked === 0
                ? "Responses"
                : `Responses of ${asked} invited`}
          </div>
        </div>
        <div className="stat">
          <div className="stat__value">{selfDone ? "✓" : "—"}</div>
          <div className="stat__label">
            {selfDone ? "Self-assessment complete" : "Self-assessment needed"}
          </div>
        </div>
      </div>

      {!released && (
        <div className="msf-columns">
          <div className="stack">
            <div className="card stack">
              <h2>Nominated raters</h2>
              {status === "closed" ? (
                <p className="muted small">The window has closed — no more raters can be added.</p>
              ) : (
                <ActionForm action={addMsfRater} submitLabel="Send">
                  <input type="hidden" name="request_id" value={request.id} />
                  <div className="field-row">
                    <div className="field">
                      <label htmlFor="full_name">Full name</label>
                      <input id="full_name" name="full_name" type="text" required />
                    </div>
                    <div className="field">
                      <label htmlFor="email">Email address</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="e.g. ade@trust.nhs.uk"
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label className="choice" htmlFor="ask_overall">
                      <input id="ask_overall" name="ask_overall" type="checkbox" defaultChecked />{" "}
                      Ask them the overall comparison question
                    </label>
                    <div className="hint">Untick for colleagues not placed to judge it.</div>
                  </div>
                </ActionForm>
              )}

              {asked > 0 && (
                <ul className="bullets small">
                  {/* Who was invited — which the subject typed, so it is
                      theirs to see. Whether each has replied is not: a name
                      beside "hasn't answered" is the strongest attribution
                      aid anyone could be handed once the answers arrive. */}
                  {invitations.map((i) => (
                    <li key={i.id}>
                      {i.full_name ?? i.email}
                      <span className="muted"> · {i.email}</span>
                    </li>
                  ))}
                </ul>
              )}
              {asked > 0 && !enoughInvited && (
                <p className="hint">Invite at least {MSF_MIN_COLLEAGUES}, or the results will not open.</p>
              )}
              {status === "draft" && asked === 0 && (
                <form action={deleteMsfRequest}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <button type="submit" className="btn btn--quiet btn--small">
                    Delete this round
                  </button>
                </form>
              )}
              {status === "open" && (
                <p className="muted small">
                  Your round closes {formatDate(request.closes_on as string)}
                  {daysLeft !== null && daysLeft >= 0 ? ` — ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left.` : "."}
                </p>
              )}
              {canRemind(request) && asked - replied - declined > 0 && (
                <form action={sendMsfReminder}>
                  <input type="hidden" name="request_id" value={request.id} />
                  {/* No number: the count on this page is a weekly checkpoint,
                      and a live figure here would undo that. */}
                  <button type="submit" className="btn btn--secondary">
                    Remind everyone who hasn&rsquo;t replied
                  </button>
                </form>
              )}
              {request.reminded_on && (
                <p className="hint">Reminder sent {formatDate(request.reminded_on)}.</p>
              )}
            </div>
          </div>

          <div className="stack">
            <div className="card stack">
              <h2>Responses</h2>
              {shownReplies === null ? (
                <p className="muted small">Counted from day 7, then again at day 14.</p>
              ) : (
                <p className="msf-count">
                  <strong>{shownReplies}</strong> out of <strong>{asked}</strong>
                </p>
              )}
            </div>

            {!selfDone && (
              <div className="card stack">
                <h2>Your self-assessment</h2>
                <p className="muted small">
                  Answer the same questions about yourself. Results stay sealed until you have.
                </p>
                <details>
                  <summary className="btn btn--secondary">Start now</summary>
                  <div className="stack" style={{ marginTop: "var(--space-4)" }}>
                    <MsfForm selfRequestId={request.id} captions={captions} />
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      )}

      {status === "closed" && !released && (
        <div className="notice notice--info">
          <p className="small">
            {!enoughInvited
              ? `Closed with only ${asked} raters invited. Results open at ${MSF_MIN_COLLEAGUES}.`
              : "Complete your self-assessment to see the results."}
          </p>
        </div>
      )}

      {released && responses.length === 0 && (
        <div className="card empty">
          <p className="empty__title">Nobody replied</p>
          <p>The window closed with no answers.</p>
        </div>
      )}

      {released && responses.length > 0 && (
        <>
          {responses.length < MSF_SMALL_SAMPLE && (
            <div className="notice notice--warn">
              <p className="small">
                <strong>Only {responses.length} replies.</strong> Treat these as indicative
                rather than representative &mdash; and with this few, a written answer can be
                traceable from its wording. Please don&rsquo;t try to work out who wrote what.
              </p>
            </div>
          )}

          <div className="card card--flush">
            <div className="table-wrap">
              <table className="table table--stack">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th className="col--bar">Colleagues</th>
                    <th>You</th>
                    <th>Spread (low &rarr; high)</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((item) => {
                    const own = Number(selfAnswers?.[item.question.key] ?? 0);
                    return (
                      <tr key={item.question.key}>
                        <td data-label=".">
                          {renderMsfQuestion(item.question.template, captions)}
                          {item.abstained > 0 && (
                            <div className="muted small">{item.abstained} could not comment</div>
                          )}
                        </td>
                        <td data-label="Colleagues" className="col--bar">
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
                        <td data-label="You" className="small">
                          {own >= 1 ? own : "—"}
                        </td>
                        <td data-label="Spread" className="small">
                          {item.rated > 0 ? item.distribution.join(" · ") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {MSF_TEXT_QUESTIONS.map((question) => {
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
            {request.reference} &middot; Rated against &ldquo;{request.compared_to}&rdquo;.
            Scale: {MSF_SCALE_LABELS.map((l, i) => `${i + 1} ${l.toLowerCase()}`).join(" · ")}.
            Replies are not linked to who gave them.
          </p>
        </>
      )}
    </main>
  );
}
