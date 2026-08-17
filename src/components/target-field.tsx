"use client";

import { useState } from "react";

/**
 * The annual CPD target, asked as a question rather than assumed.
 *
 * Most UK regulators set no number at all — the HCPC asks for a mixture of
 * learning, the engineering institutions for evidence of planned development —
 * so presenting an empty box marked "target" invites people to invent a figure
 * and then measure themselves against something nobody asked of them.
 *
 * Zero is what "no target" stores. The box only appears once someone says they
 * have one.
 */
export function TargetField({ value }: { value: number }) {
  const [hasTarget, setHasTarget] = useState(value > 0);

  return (
    <>
      <div className="field">
        <label className="choice" htmlFor="has_target">
          <input
            id="has_target"
            name="has_target"
            type="checkbox"
            defaultChecked={value > 0}
            onChange={(e) => setHasTarget(e.currentTarget.checked)}
          />{" "}
          I have an annual CPD target to work towards
        </label>
        <div className="hint">
          Some regulators set a number — 50 credits a year is common for doctors, 35 hours for
          financial advisers. Many set none at all, in which case leave this unticked and your
          dashboard will count what you have done rather than measure it against a figure.
        </div>
      </div>
      {hasTarget && (
        <div className="field">
          <label htmlFor="annual_target_points">Annual CPD target (points/credits)</label>
          <input
            id="annual_target_points"
            name="annual_target_points"
            type="number"
            min={0}
            step="0.5"
            defaultValue={value > 0 ? value : ""}
          />
        </div>
      )}
    </>
  );
}
