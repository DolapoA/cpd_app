import type { PdpGoal } from "@/lib/db";

/**
 * The fields of a development goal, shared by adding and editing — one copy
 * so the two forms cannot drift. The five questions are the ones every UK
 * appraisal template asks, in its order: the need, where it came from, what
 * you'll do, how you'll know, and by when.
 *
 * No client state, so no "use client": everything here is plain inputs.
 */
export function PdpFields({
  goal,
  prefill,
}: {
  goal?: PdpGoal;
  prefill?: { title?: string; identifiedFrom?: string };
}) {
  return (
    <>
      <div className="field">
        <label htmlFor="title">What do you want to develop?</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="e.g. Chairing multidisciplinary meetings"
          defaultValue={goal?.title ?? prefill?.title ?? ""}
        />
      </div>
      <div className="field">
        <label htmlFor="identified_from">How was this identified?</label>
        <input
          id="identified_from"
          name="identified_from"
          type="text"
          placeholder="e.g. appraisal discussion, MSF round, audit"
          defaultValue={goal?.identified_from ?? prefill?.identifiedFrom ?? ""}
        />
      </div>
      <div className="field">
        <label htmlFor="actions">What will you do?</label>
        <textarea
          id="actions"
          name="actions"
          rows={3}
          placeholder="The course, the shadowing, the practice — the concrete steps."
          defaultValue={goal?.actions ?? ""}
        />
      </div>
      <div className="field">
        <label htmlFor="success_criteria">How will you show it worked?</label>
        <textarea
          id="success_criteria"
          name="success_criteria"
          rows={2}
          placeholder="What an appraiser could look at and agree it happened."
          defaultValue={goal?.success_criteria ?? ""}
        />
      </div>
      <div className="field">
        <label htmlFor="target_date">Target date</label>
        <input
          id="target_date"
          name="target_date"
          type="date"
          defaultValue={goal?.target_date ?? ""}
        />
      </div>
    </>
  );
}
