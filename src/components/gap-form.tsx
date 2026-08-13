"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { fillEntryGaps, type ActionState } from "@/lib/actions";
import { ACTIVITY_TYPES } from "@/lib/format";
import type { Gap } from "@/lib/completeness";
import type { StandardsFramework } from "@/lib/standards";

function Save() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function GapForm({
  entryId,
  gaps,
  framework,
}: {
  entryId: number;
  gaps: Gap[];
  framework: StandardsFramework | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(fillEntryGaps, null);
  const missing = new Set(gaps.map((g) => g.key));

  return (
    <form action={action}>
      <input type="hidden" name="entry_id" value={entryId} />

      {missing.has("reflection") && (
        <div className="field">
          <label htmlFor={`notes-${entryId}`}>What did you learn, and what will you do differently?</label>
          <textarea id={`notes-${entryId}`} name="notes" rows={3} />
        </div>
      )}

      <div className="field-row">
        {missing.has("time") && (
          <div className="field">
            <label htmlFor={`hours-${entryId}`}>Hours</label>
            <input id={`hours-${entryId}`} name="hours" type="number" min={0} step="0.25" />
          </div>
        )}
        {missing.has("type") && (
          <div className="field">
            <label htmlFor={`type-${entryId}`}>Activity type</label>
            <select id={`type-${entryId}`} name="activity_type" defaultValue="">
              <option value="">Leave as “Other”</option>
              {ACTIVITY_TYPES.filter((t) => t !== "Other").map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {framework && missing.has("standards") && (
        <div className="field">
          <label>{framework.fieldLabel}</label>
          <div className="std-options">
            {framework.items.map((item) => (
              <label className="std-option" key={item.code}>
                <input
                  type={framework.multiple ? "checkbox" : "radio"}
                  name="standards"
                  value={item.code}
                />
                <span className="std-option__code">{item.code}</span>
                <span className="std-option__title">{item.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <Save />
    </form>
  );
}
