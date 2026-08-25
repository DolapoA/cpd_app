"use client";

import { useState } from "react";

/**
 * The review verdict on a goal: what happened, said once, at the end.
 *
 * Client-side only because carrying a goal forward needs one extra answer —
 * the new target date — and the field should appear when the choice is made
 * rather than sit permanently in the form asking a question that usually
 * doesn't apply.
 */
export function PdpReviewFields() {
  const [outcome, setOutcome] = useState("");

  return (
    <>
      <div className="field">
        <label>What happened?</label>
        <div className="field-row">
          {[
            ["achieved", "Achieved"],
            ["carried", "Carry forward"],
            ["dropped", "No longer relevant"],
          ].map(([value, label]) => (
            <label key={value} className="choice">
              <input
                type="radio"
                name="outcome"
                value={value}
                required
                checked={outcome === value}
                onChange={() => setOutcome(value)}
              />{" "}
              {label}
            </label>
          ))}
        </div>
      </div>
      {outcome === "carried" && (
        <div className="field">
          <label htmlFor="new_target_date">New target date</label>
          <input id="new_target_date" name="new_target_date" type="date" required />
          <div className="hint">The goal stays on your plan with this date; today&rsquo;s version moves to history.</div>
        </div>
      )}
      {outcome !== "" && (
        <div className="field">
          <label htmlFor="outcome_reflection">
            {outcome === "dropped" ? "Why not? (optional)" : "What changed?"}
          </label>
          <textarea
            id="outcome_reflection"
            name="outcome_reflection"
            rows={2}
            required={outcome !== "dropped"}
            placeholder="A sentence is enough."
          />
        </div>
      )}
    </>
  );
}
