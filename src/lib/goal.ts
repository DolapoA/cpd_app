/**
 * Whole days from today until a target date. Negative once it has passed.
 * Compared date-only so a target "today" reads as 0 rather than a few hours.
 */
export function daysUntil(target: string | null | undefined): number | null {
  if (!target) return null;
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  const then = new Date(target + "T00:00:00Z").getTime();
  if (isNaN(then)) return null;
  return Math.round((then - today) / 86400000);
}

/** How loudly to nudge: quiet until the target is near, then progressively firmer. */
export function goalUrgency(days: number | null): "none" | "soon" | "urgent" | "overdue" {
  if (days === null) return "none";
  if (days < 0) return "overdue";
  if (days <= 30) return "urgent";
  if (days <= 90) return "soon";
  return "none";
}
