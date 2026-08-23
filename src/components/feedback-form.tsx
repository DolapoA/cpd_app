"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitFeedback, type ActionState } from "@/lib/actions";
import {
  FEEDBACK_COMMENT_HINT,
  FEEDBACK_COMMENT_PLACEHOLDER,
  FEEDBACK_COMMENT_PROMPT,
  FEEDBACK_QUESTIONS,
} from "@/lib/feedback";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "Sending…" : "Send feedback"}
    </button>
  );
}

export function FeedbackForm({
  verificationCode,
  canKeepReflection,
}: {
  verificationCode: string;
  canKeepReflection: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(submitFeedback, null);
  const [dismissed, setDismissed] = useState(false);
  const [showComment, setShowComment] = useState(false);

  if (dismissed) {
    return (
      <div className="card">
        <p className="muted small">
          No problem — your attendance is recorded either way.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="fb-heading">How was it?</h1>
      <p className="muted small">Five quick taps, optional — your attendance is already saved.</p>
      <p className="fb-anon">Answer these questions anonymously.</p>

      <form action={formAction}>
        <input type="hidden" name="verification_code" value={verificationCode} />

        {FEEDBACK_QUESTIONS.map((question) => (
          <div
            className="rating"
            role="radiogroup"
            aria-labelledby={`${question.key}-label`}
            key={question.key}
          >
            <p className="rating__legend" id={`${question.key}-label`}>
              {question.text}
            </p>
            <div className="rating__options">
              {question.labels.map((label, i) => (
                <label className="rating__option" key={label}>
                  <input type="radio" name={question.key} value={i + 1} required />
                  <span className="rating__dot">{i + 1}</span>
                  <span className="rating__label">{label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {showComment ? (
          <div className="field">
            <label htmlFor="comments">{FEEDBACK_COMMENT_PROMPT}</label>
            <textarea
              id="comments"
              name="comments"
              rows={4}
              maxLength={4000}
              placeholder={FEEDBACK_COMMENT_PLACEHOLDER}
            />
            <div className="hint">{FEEDBACK_COMMENT_HINT}</div>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--secondary btn--small"
           
            onClick={() => setShowComment(true)}
          >
            + Add a comment (optional)
          </button>
        )}

        {canKeepReflection && (
          <div className="field">
            <label className="choice">
              <input type="checkbox" name="keep_reflection" value="yes" defaultChecked /> Also save
              my answers as a reflection on my own CPD record
            </label>
            <div className="hint">
              Private to you, for appraisal or audit. The organiser never sees it.
            </div>
          </div>
        )}

        {state?.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}

        <div className="actions-row">
          <SubmitButton />
          <button type="button" className="btn btn--secondary" onClick={() => setDismissed(true)}>
            No thanks
          </button>
        </div>
      </form>
    </div>
  );
}
