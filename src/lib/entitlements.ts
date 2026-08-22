import type { User } from "./db";

/**
 * Who gets the paid features.
 *
 * One question, answered in one place. Until billing exists, the plan column
 * is set by hand (see the grant SQL in the deployment notes), which is the
 * deliberate order of things: the features are built and gated first, and the
 * switch that flips them is a one-word column — so turning a paying customer
 * on never involves a deploy.
 */
export function isOrganiserPlan(user: Pick<User, "plan">): boolean {
  return user.plan === "organiser";
}

/** JSONB comes back as whatever the driver felt like; always hand back an array. */
export function parseJsonArray<T>(value: string | T[] | null | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
