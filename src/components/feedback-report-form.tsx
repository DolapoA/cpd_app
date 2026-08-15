"use client";

import { usePathname } from "next/navigation";
import { submitFeedbackReport } from "@/lib/actions";
import { ActionForm } from "./action-form";

const KINDS = ["Something is broken", "Something is confusing", "An idea", "Anything else"];

/**
 * Captures where the person was and what they were using, so a report does not
 * have to begin with us asking. The destination address lives in the server
 * action — it is never rendered into the page.
 */
export function FeedbackReportForm({
  signedInAs,
  aboutPage,
}: {
  signedInAs: string | null;
  aboutPage?: string;
}) {
  const pathname = usePathname();
  const page = aboutPage ?? pathname;

  return (
    <ActionForm action={submitFeedbackReport} submitLabel="Send it">
      <input type="hidden" name="page" value={page} />
      <input
        type="hidden"
        name="user_agent"
        value={typeof navigator === "undefined" ? "" : navigator.userAgent}
      />

      <div className="field">
        <label htmlFor="kind">What kind of thing is it?</label>
        <select id="kind" name="kind" defaultValue={KINDS[0]}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="message">What happened?</label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          minLength={10}
          placeholder="What you were trying to do, and what happened instead."
        />
        <div className="hint">
          Please don&rsquo;t include anything about a patient, client or colleague.
        </div>
      </div>

      {signedInAs ? (
        <p className="hint">
          We&rsquo;ll reply to <strong>{signedInAs}</strong>, and we can see which page you were on.
        </p>
      ) : (
        <div className="field">
          <label htmlFor="reply_to">Your email</label>
          <input id="reply_to" name="reply_to" type="email" autoComplete="email" />
          <div className="hint">
            Optional. Without it we can read your report but can&rsquo;t reply or ask anything.
          </div>
        </div>
      )}
    </ActionForm>
  );
}
