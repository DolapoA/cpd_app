import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { invitationForToken, msfStatus } from "@/lib/msf-invites";
import { declineMsfInvitation } from "@/lib/actions";
import { MsfForm } from "@/components/msf-form";
import { MSF_RATED_QUESTIONS, MSF_TEXT_QUESTIONS } from "@/lib/msf";

export const metadata = { title: "Feedback for a colleague — CPD Register" };

/**
 * Where a colleague answers.
 *
 * Reading this page never spends the link. Mail scanners in a hospital or a
 * firm fetch every URL in an incoming message before a human sees it, and a
 * page that marked the invitation used on GET would burn every invitation the
 * moment it arrived. Only submitting spends it.
 */
export default async function MsfRespondPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const found = await invitationForToken(token);
  if (!found) notFound();

  const { invitation, request } = found;
  // An invitation cannot exist before the first rater was added, and adding
  // the first rater is what stamps the window — so it is set here.
  const closesOn = request.closes_on as string;
  const closed = msfStatus(request) === "closed";
  const spent = !!invitation.responded;
  const declined = !!invitation.declined_at;

  if (spent || declined || closed) {
    return (
      <main className="container container--narrow stack">
        <div className="card">
          <h1>{spent ? "You have already answered" : declined ? "You declined this" : "This round has closed"}</h1>
          <p className="muted">
            {spent
              ? `Your feedback for ${request.subject_name} was received. Thank you — it is pooled with everyone else's.`
              : declined
                ? "Nothing was sent, and you will not be reminded again."
                : `Feedback for ${request.subject_name} closed on ${formatDate(closesOn)}.`}
          </p>
        </div>
      </main>
    );
  }

  const captions = {
    name: request.subject_name,
    word: request.subject_word,
    comparedTo: request.compared_to,
  };

  return (
    <main className="container container--narrow stack">
      <div className="card">
        <h1>Feedback for {request.subject_name}</h1>
        <p className="muted">
          {MSF_RATED_QUESTIONS.length} ratings and {MSF_TEXT_QUESTIONS.length} written answers.
          About five minutes.
        </p>
      </div>

      {/* Said before they answer, not after. The last sentence is the one
          people need and are least often given: prose carries a voice. */}
      <div className="notice notice--info">
        <h2 className="notice__title">This is anonymous</h2>
        <p className="small">
          Your answers are pooled with the other colleagues&rsquo; and shown to{" "}
          {request.subject_name} after {formatDate(closesOn)}. Your name, your email
          address and the date you answered are <strong>not stored with your answers</strong> —
          they cannot be, so nobody can work out which reply was yours.
        </p>
        <p className="small">
          Written comments are passed on word for word, so what you write can identify you even
          though your name is not attached to it.
        </p>
      </div>

      <div className="card">
        <MsfForm token={token} captions={captions} />
      </div>

      <div className="card">
        <h2>Would rather not?</h2>
        <p className="muted small">
          Declining stops the reminder. {request.subject_name} is told how many people replied,
          never who — so they will not know it was you.
        </p>
        <form action={declineMsfInvitation}>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="btn btn--quiet">
            No thanks
          </button>
        </form>
      </div>
    </main>
  );
}
