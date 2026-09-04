/**
 * A development plan written before there is an account to keep it in.
 *
 * The guest's goals live in their own browser until they choose to keep them:
 * nothing is sent anywhere while they write, and a plan abandoned half-way is
 * nobody's data but theirs. When they sign up — or log in — the draft rides
 * along as one hidden field and becomes real goals on the new record.
 *
 * Client-safe: no server imports. The parser is shared by the page that
 * writes the draft and the action that receives it, so both agree on what a
 * goal is.
 */
export const GUEST_PLAN_KEY = "cpd:guest-plan";
export const GUEST_PLAN_MAX = 20;
export const GUEST_GOALS_FIELD = "guest_goals";

export type GuestGoal = {
  title: string;
  identified_from: string;
  actions: string;
  success_criteria: string;
  target_date: string;
};

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * How many goals, bucketed the way the server-side events bucket counts — a
 * single unusual number must not identify the person it belongs to. Here
 * rather than imported from lib/analytics, which is server-only.
 */
export function bucketGoals(n: number): "1-5" | "6-10" | "11-20" {
  if (n <= 5) return "1-5";
  if (n <= 10) return "6-10";
  return "11-20";
}

/** Whatever arrived, reduced to goals worth keeping — or none. */
export function parseGuestGoals(raw: unknown): GuestGoal[] {
  let value = raw;
  if (typeof value === "string") {
    if (!value.trim()) return [];
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((g) => {
      const goal = (g ?? {}) as Record<string, unknown>;
      const target = clip(goal.target_date, 10);
      return {
        title: clip(goal.title, 200),
        identified_from: clip(goal.identified_from, 500),
        actions: clip(goal.actions, 2000),
        success_criteria: clip(goal.success_criteria, 2000),
        target_date: /^\d{4}-\d{2}-\d{2}$/.test(target) ? target : "",
      };
    })
    .filter((g) => g.title)
    .slice(0, GUEST_PLAN_MAX);
}
