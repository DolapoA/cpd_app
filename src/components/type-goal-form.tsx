"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setActivityTypeGoal, type ActionState } from "@/lib/actions";

function Save({ hasGoal }: { hasGoal: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--secondary btn--small" disabled={pending}>
      {pending ? "Saving…" : hasGoal ? "Update" : "Set target"}
    </button>
  );
}

export function TypeGoalForm({
  activityType,
  targetDate,
}: {
  activityType: string;
  targetDate: string | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(setActivityTypeGoal, null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="type-goal">
      <input type="hidden" name="activity_type" value={activityType} />
      <label className="type-goal__label" htmlFor={`goal-${activityType}`}>
        Target date
      </label>
      <input
        id={`goal-${activityType}`}
        name="target_date"
        type="date"
        min={today}
        defaultValue={targetDate ?? ""}
        className="type-goal__input"
      />
      <Save hasGoal={!!targetDate} />
      {targetDate && <span className="type-goal__hint">Clear the date to remove it.</span>}
      {state?.error && (
        <span className="type-goal__error" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}
