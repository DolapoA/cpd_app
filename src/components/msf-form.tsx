"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitMsfResponse, submitMsfSelfAssessment } from "@/lib/actions";
import {
  MSF_ABSTAIN,
  MSF_ABSTAIN_LABEL,
  MSF_RATED_QUESTIONS,
  MSF_SCALE_LABELS,
  MSF_TEXT_QUESTIONS,
  renderMsfQuestion,
  type MsfCaptions,
} from "@/lib/msf";

/**
 * The colleague's form: seventeen ratings and three written answers.
 *
 * Long, and there is no honest way to make it short — so the work goes into
 * not losing it. Answers are held in this browser as they are given, because
 * the alternative, a draft row keyed to the invitation, would store partial
 * answers against a named person: the exact link the whole design refuses.
 *
 * "Unable to comment" sits below the scale rather than beside it, because it
 * is not a sixth point. Placing it after "Below expectations" would read as
 * worse than the worst rating, when it means the opposite — that this person
 * has never been in a position to judge.
 */

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--large" disabled={pending}>
      {pending ? "Sending…" : label}
    </button>
  );
}

export function MsfForm({
  token,
  captions,
  selfRequestId,
  askOverall = true,
}: {
  token?: string;
  captions: MsfCaptions;
  /** Set when the subject is rating themselves; the questions are the same. */
  selfRequestId?: number;
  /** Whether this rater was chosen for the overall comparison question. */
  askOverall?: boolean;
}) {
  const rated = MSF_RATED_QUESTIONS.filter((q) => askOverall || !q.optional);
  const [state, action] = useActionState(
    selfRequestId ? submitMsfSelfAssessment : submitMsfResponse,
    null
  );
  const [answered, setAnswered] = useState(0);
  const storeKey = selfRequestId
    ? `cpd:msf-self:${selfRequestId}`
    : `cpd:msf:${(token ?? "").slice(0, 12)}`;

  // Restore whatever this browser was holding, then keep it current.
  useEffect(() => {
    let saved: Record<string, string> = {};
    try {
      saved = JSON.parse(localStorage.getItem(storeKey) ?? "{}");
    } catch {
      // A private window, or nothing there. Either way, start clean.
    }
    const form = document.getElementById("msf") as HTMLFormElement | null;
    if (!form) return;
    for (const [name, value] of Object.entries(saved)) {
      const field = form.elements.namedItem(name);
      if (field instanceof HTMLTextAreaElement) field.value = value;
      else {
        const radio = form.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
        if (radio) radio.checked = true;
      }
    }
    count();
  }, [storeKey]);

  function count() {
    const form = document.getElementById("msf") as HTMLFormElement | null;
    if (!form) return;
    setAnswered(
      rated.filter((q) => form.querySelector(`input[name="${q.key}"]:checked`)).length
    );
  }

  function save() {
    const form = document.getElementById("msf") as HTMLFormElement | null;
    if (!form) return;
    const data: Record<string, string> = {};
    for (const q of MSF_RATED_QUESTIONS) {
      const picked = form.querySelector<HTMLInputElement>(`input[name="${q.key}"]:checked`);
      if (picked) data[q.key] = picked.value;
    }
    for (const q of MSF_TEXT_QUESTIONS) {
      const field = form.elements.namedItem(q.key);
      if (field instanceof HTMLTextAreaElement && field.value) data[q.key] = field.value;
    }
    try {
      localStorage.setItem(storeKey, JSON.stringify(data));
    } catch {
      // Nothing to be done, and nothing worth interrupting them for.
    }
  }

  return (
    <form
      id="msf"
      action={action}
      onChange={() => {
        count();
        save();
      }}
      className="stack"
    >
      {selfRequestId ? (
        <input type="hidden" name="request_id" value={selfRequestId} />
      ) : (
        <input type="hidden" name="token" value={token} />
      )}

      <p className="msf-progress" aria-live="polite">
        {answered} of {rated.length} answered
      </p>

      {state?.error && <p className="form-error">{state.error}</p>}

      {rated.map((question, index) => (
        <fieldset className="rating" key={question.key}>
          <legend className="rating__legend">
            {index + 1}. {renderMsfQuestion(question.template, captions)}
            {question.optional && <span className="muted"> (optional)</span>}
          </legend>
          <div className="rating__options">
            {MSF_SCALE_LABELS.map((label, i) => (
              <label className="rating__option" key={label}>
                <input type="radio" name={question.key} value={i + 1} required={!question.optional} />
                <span className="rating__dot">{i + 1}</span>
                <span className="rating__label">{label}</span>
              </label>
            ))}
          </div>
          <label className="rating__abstain">
            <input type="radio" name={question.key} value={MSF_ABSTAIN} />
            <span>{MSF_ABSTAIN_LABEL}</span>
          </label>
        </fieldset>
      ))}

      {MSF_TEXT_QUESTIONS.map((question, index) => (
        <div className="field" key={question.key}>
          <label htmlFor={question.key}>
            {rated.length + index + 1}. {renderMsfQuestion(question.template, captions)}
          </label>
          <textarea
            id={question.key}
            name={question.key}
            rows={3}
            maxLength={2000}
            placeholder={question.placeholder}
          />
        </div>
      ))}

      <div className="actions-row">
        <Submit label={selfRequestId ? "Save my self-assessment" : "Send my feedback"} />
      </div>
    </form>
  );
}
