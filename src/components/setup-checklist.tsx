import Link from "next/link";
import type { SetupState, SetupStep } from "@/lib/setup";

function Task({ step }: { step: SetupStep }) {
  return (
    <li className={`task${step.done ? " task--done" : ""}`}>
      <span className="task__mark" aria-hidden="true">
        {step.done ? "✓" : ""}
      </span>
      <span className="task__label">
        {step.done ? step.label : <Link href={step.href}>{step.label}</Link>}
      </span>
    </li>
  );
}

/**
 * One group of steps: what is left, then what has been done, folded away.
 *
 * Done items are hidden rather than deleted. A list that discards finished
 * work leaves no evidence of progress, and someone who wants to check whether
 * they really did set a target has nowhere to look; a disclosure keeps both
 * without letting the finished half crowd out the unfinished one.
 */
function TaskGroup({ steps }: { steps: SetupStep[] }) {
  const outstanding = steps.filter((s) => !s.done);
  const done = steps.filter((s) => s.done);

  return (
    <>
      {outstanding.length > 0 && (
        <ul className="task-list">
          {outstanding.map((step) => (
            <Task key={step.key} step={step} />
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <details>
          <summary className="small">
            {done.length} done
          </summary>
          <ul className="task-list">
            {done.map((step) => (
              <Task key={step.key} step={step} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

export function SetupChecklist({
  state,
  showSuggestions = true,
}: {
  state: SetupState;
  showSuggestions?: boolean;
}) {
  return (
    <>
      <div className="setup__meter">
        <span className="setup__track">
          {/* The one dynamic style in the app's convention: a custom property,
              so the width lives in the stylesheet and only the number here. */}
          <span className="setup__fill" style={{ "--fill": `${state.percent}%` } as React.CSSProperties} />
        </span>
        <span className="setup__count">
          {state.completed} of {state.total}
        </span>
      </div>

      <TaskGroup steps={state.profile} />

      {showSuggestions && (
        <details>
          <summary className="small">Now get the most out of it</summary>
          <TaskGroup steps={state.suggestions} />
        </details>
      )}
    </>
  );
}
