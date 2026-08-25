import type { PdpGoal } from "@/lib/db";

/**
 * "Towards a development goal" — the optional link from an activity to the
 * goal it serves. Renders nothing when there are no active goals, so the
 * form carries no question that has no answers.
 */
export function PdpGoalSelect({
  goals,
  selected,
}: {
  goals: Pick<PdpGoal, "id" | "title">[];
  selected?: number | null;
}) {
  if (goals.length === 0) return null;
  return (
    <div className="field">
      <label htmlFor="pdp_goal_id">Towards a development goal</label>
      <select id="pdp_goal_id" name="pdp_goal_id" defaultValue={selected ? String(selected) : ""}>
        <option value="">None</option>
        {goals.map((goal) => (
          <option key={goal.id} value={goal.id}>
            {goal.title}
          </option>
        ))}
      </select>
    </div>
  );
}
