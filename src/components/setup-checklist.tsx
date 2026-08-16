import Link from "next/link";
import type { SetupState, SetupStep } from "@/lib/setup";

function Task({ step }: { step: SetupStep }) {
  return (
    <li className={`task${step.done ? " task--done" : ""}`}>
      <span className="task__mark" aria-hidden="true">
        {step.done ? "✓" : ""}
      </span>
      <span>
        <span className="task__label">
          {step.done ? step.label : <Link href={step.href}>{step.label}</Link>}
        </span>
        {!step.done && <span className="task__detail"> — {step.detail}</span>}
      </span>
    </li>
  );
}

/**
 * How far setting up has got, and what is left.
 *
 * Done items stay on the list rather than disappearing. A list that only ever
 * shows what is outstanding never looks like progress, however much of it
 * there has been.
 */
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

      <ul className="task-list">
        {state.profile.map((step) => (
          <Task key={step.key} step={step} />
        ))}
      </ul>

      {showSuggestions && (
        <>
          <h3>Then, to get the most out of it</h3>
          <ul className="task-list">
            {state.suggestions.map((step) => (
              <Task key={step.key} step={step} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}
