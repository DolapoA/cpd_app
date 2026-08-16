"use client";

import { useState } from "react";
import type { PlannedEvent } from "@/lib/db";

/**
 * The fields of a planned event, shared by adding and editing.
 *
 * One copy so the two forms cannot drift — a date field that validates on one
 * page and not the other is the sort of difference nobody notices until an
 * event lands in a calendar on the wrong day.
 */
export function PlannedFields({ plan }: { plan?: PlannedEvent }) {
  // Sharing a private event is not a thing that can be meant, so the second
  // choice only appears once the first is made.
  const [isPublic, setIsPublic] = useState(!!plan?.is_public);

  return (
    <>
          <div className="field">
            <label htmlFor="title">What is it?</label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. Annual conference"
              defaultValue={plan?.title ?? ""}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="starts_on">Starts</label>
              <input
                id="starts_on"
                name="starts_on"
                type="date"
                required
                defaultValue={plan?.starts_on ?? ""}
              />
            </div>
            <div className="field">
              <label htmlFor="ends_on">Ends</label>
              <input id="ends_on" name="ends_on" type="date" defaultValue={plan?.ends_on ?? ""} />
              <div className="hint">Only if it runs over more than one day.</div>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="start_time">From</label>
              <input
                id="start_time"
                name="start_time"
                type="time"
                defaultValue={plan?.start_time ?? ""}
              />
            </div>
            <div className="field">
              <label htmlFor="end_time">Until</label>
              <input id="end_time" name="end_time" type="time" defaultValue={plan?.end_time ?? ""} />
              <div className="hint">Leave both blank and it goes in as an all-day entry.</div>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="provider">Who&rsquo;s running it?</label>
              <input
                id="provider"
                name="provider"
                type="text"
                defaultValue={plan?.provider ?? ""}
              />
            </div>
            <div className="field">
              <label htmlFor="location">Where?</label>
              <input
                id="location"
                name="location"
                type="text"
                placeholder="e.g. Manchester, or online"
                defaultValue={plan?.location ?? ""}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="url">Link</label>
            <input
              id="url"
              name="url"
              type="url"
              placeholder="https://"
              defaultValue={plan?.url ?? ""}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="expected_points">Expected points</label>
              <input
                id="expected_points"
                name="expected_points"
                type="number"
                min={0}
                step="0.5"
                defaultValue={plan?.expected_points ?? ""}
              />
            </div>
            <div className="field">
              <label htmlFor="expected_hours">Expected hours</label>
              <input
                id="expected_hours"
                name="expected_hours"
                type="number"
                min={0}
                step="0.5"
                defaultValue={plan?.expected_hours ?? ""}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" rows={3} defaultValue={plan?.notes ?? ""} />
            <div className="hint">
              What you want to get out of it. This carries over to your record if you attend.
            </div>
          </div>
      <div className="field">
        <label className="choice" htmlFor="is_public">
          <input
            id="is_public"
            name="is_public"
            type="checkbox"
            defaultChecked={!!plan?.is_public}
            onChange={(e) => setIsPublic(e.currentTarget.checked)}
          />{" "}
          Anyone can attend this
        </label>
        <div className="hint">
          A conference, course or open study day — as opposed to a team meeting or something
          only your workplace can attend.
        </div>
      </div>
      {isPublic && (
        <div className="field">
          <label className="choice" htmlFor="shared">
            <input
              id="shared"
              name="shared"
              type="checkbox"
              defaultChecked={!!plan?.shared}
            />{" "}
            Let others in my profession see it
          </label>
          <div className="hint">
            They see the event, never your name — only that someone in the profession has it
            planned. Untick at any time and it disappears from their list.
          </div>
        </div>
      )}
    </>
  );
}
