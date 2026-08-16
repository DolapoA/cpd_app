"use client";

import { useState } from "react";
import { OTHER_PROFESSION, PROFESSION_GROUPS, isListedProfession } from "@/lib/professions";

/**
 * Picking a profession from a list, with a way out.
 *
 * The list exists so two people doing the same job can be recognised as doing
 * the same job. The free-text box exists because no list is complete, and
 * telling someone their profession is not on it is a poor welcome.
 *
 * Someone whose stored profession predates the list keeps it: it is preselected
 * as "Other" with their own words still in the box, so opening the profile page
 * cannot quietly rewrite what they told us.
 */
export function ProfessionField({ defaultValue }: { defaultValue?: string | null }) {
  const listed = isListedProfession(defaultValue);
  const [choice, setChoice] = useState(
    listed ? (defaultValue as string) : defaultValue ? OTHER_PROFESSION : ""
  );

  return (
    <>
      <div className="field">
        <label htmlFor="profession">Profession</label>
        <select
          id="profession"
          name="profession"
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
        >
          <option value="">Choose…</option>
          {PROFESSION_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.professions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={OTHER_PROFESSION}>Other — I&rsquo;ll type it</option>
        </select>
      </div>
      {choice === OTHER_PROFESSION && (
        <div className="field">
          <label htmlFor="profession_other">Your profession</label>
          <input
            id="profession_other"
            name="profession_other"
            type="text"
            defaultValue={listed ? "" : (defaultValue ?? "")}
            placeholder="e.g. Sports therapist"
          />
          <div className="hint">
            We&rsquo;ll match you with others who type the same thing, so the usual name for the
            job works better than a job title.
          </div>
        </div>
      )}
    </>
  );
}
