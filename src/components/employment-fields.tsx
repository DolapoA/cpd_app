"use client";

import { useState } from "react";

/**
 * Adding a job to the history.
 *
 * Months from selects rather than an `<input type="month">`, which Safari does
 * not implement and quietly degrades to a text box where somebody has to know
 * to type "2023-07". Two selects work the same way everywhere and match how
 * people remember employment anyway.
 *
 * "Still here" hides the end rather than disabling it, because an end date you
 * can see but not use invites a second look every time.
 */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function MonthYear({ prefix, label }: { prefix: string; label: string }) {
  const thisYear = new Date().getFullYear();
  // Fifty years covers a whole career, which is the point of a history.
  const years = Array.from({ length: 51 }, (_, i) => thisYear - i);

  return (
    <fieldset className="field">
      <legend>{label}</legend>
      <div className="field-row">
        <div className="field">
          <label htmlFor={`${prefix}_month`} className="sr-only">
            {label} month
          </label>
          <select id={`${prefix}_month`} name={`${prefix}_month`} defaultValue="">
            <option value="">Month</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${prefix}_year`} className="sr-only">
            {label} year
          </label>
          <select id={`${prefix}_year`} name={`${prefix}_year`} defaultValue="">
            <option value="">Year</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
    </fieldset>
  );
}

export function EmploymentFields() {
  const [current, setCurrent] = useState(true);

  return (
    <>
      <div className="field">
        <label htmlFor="employer">Employer</label>
        <input
          id="employer"
          name="employer"
          type="text"
          required
          placeholder="e.g. Leeds Teaching Hospitals NHS Trust"
        />
      </div>

      <div className="field">
        <label htmlFor="job_title">Job title</label>
        <input id="job_title" name="job_title" type="text" placeholder="e.g. Specialist Nurse" />
      </div>

      <MonthYear prefix="started" label="Started" />

      <div className="field">
        <label className="choice" htmlFor="current">
          <input
            id="current"
            name="current"
            type="checkbox"
            defaultChecked
            onChange={(e) => setCurrent(e.currentTarget.checked)}
          />{" "}
          I still work here
        </label>
      </div>

      {!current && <MonthYear prefix="ended" label="Left" />}
    </>
  );
}
