import Link from "next/link";
import { requireConfirmedUser } from "@/lib/auth";
import { createMsfRequest } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { professionWord } from "@/lib/professions";
import {
  MSF_MAX_COLLEAGUES,
  MSF_MIN_COLLEAGUES,
  MSF_RATED_QUESTIONS,
  MSF_WINDOW_DAYS,
  renderMsfQuestion,
} from "@/lib/msf";

export const metadata = { title: "Ask for feedback — CPD Register" };

export default async function NewColleagueFeedbackPage() {
  const user = await requireConfirmedUser();
  const word = professionWord(user.profession);
  // The two questions the profession changes, shown as they will be asked.
  const sample = MSF_RATED_QUESTIONS.find((q) => q.key === "q5");

  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Ask colleagues for feedback</h1>
          <p>
            <Link href="/record/colleague-feedback">&larr; Back</Link>
          </p>
        </div>
      </div>

      <div className="notice notice--info">
        <p className="small">
          Each colleague gets their own private link. Replies are pooled and shown to you after{" "}
          <strong>{MSF_WINDOW_DAYS} days</strong> &mdash; not before, and never attributed. You
          will see how many people replied, never which of them.
        </p>
      </div>

      <div className="card">
        <ActionForm action={createMsfRequest} submitLabel="Send the invitations">
          <div className="field">
            <label htmlFor="colleagues">Colleagues&rsquo; email addresses</label>
            <textarea
              id="colleagues"
              name="colleagues"
              rows={6}
              required
              placeholder={"ahmed@trust.nhs.uk\npriya@trust.nhs.uk\ntom@trust.nhs.uk"}
            />
            <div className="hint">
              One per line. Between {MSF_MIN_COLLEAGUES} and {MSF_MAX_COLLEAGUES}. Not everyone
              replies, so ask more people than you need &mdash; ten to twelve is usual.
            </div>
          </div>

          <div className="field">
            <label htmlFor="compared_to">Compare me with</label>
            <input
              id="compared_to"
              name="compared_to"
              type="text"
              maxLength={60}
              required
              defaultValue={user.role_grade ?? ""}
              placeholder="e.g. a Band 7 radiographer, a consultant, a colleague at my grade"
            />
            {/* The comparator is the subject's own choice, so it is printed on
                the results and in the export: whoever reads the report should
                see what the rating was against. */}
            <div className="hint">
              The last question asks colleagues to rate you against this. It is shown on your
              results and in anything you export, so choose it honestly.
            </div>
          </div>

          {sample && (
            <div className="field">
              <label>How your profession is worded</label>
              <div className="hint">
                Two questions use a word from your profession. Yours is{" "}
                <strong>{word}</strong>, so colleagues will be asked:
                <br />&ldquo;{renderMsfQuestion(sample.template, {
                  name: user.full_name,
                  word,
                  comparedTo: "",
                })}&rdquo;
              </div>
            </div>
          )}
        </ActionForm>
      </div>
    </main>
  );
}
