import Link from "next/link";
import { requireConfirmedUser } from "@/lib/auth";
import { createMsfRequest } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";

export const metadata = { title: "Ask for feedback — CPD Register" };

export default async function NewColleagueFeedbackPage() {
  const user = await requireConfirmedUser();

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

      <div className="card">
        <ActionForm action={createMsfRequest} submitLabel="Start the round">
          <div className="field">
            <label htmlFor="compared_to">Compare me with</label>
            <input
              id="compared_to"
              name="compared_to"
              type="text"
              maxLength={60}
              required
              defaultValue={user.role_grade ?? ""}
              placeholder="e.g. a Band 8a radiographer, a consultant"
            />
            <div className="hint">
              The last question asks colleagues to rate you against this aspirational position,
              it is usually one position above your current job title
            </div>
          </div>
          <p className="muted small">
            You add raters by name on the next page. The round gets a reference, and the
            21 days start when your first rater is invited.
          </p>
        </ActionForm>
      </div>
    </main>
  );
}
