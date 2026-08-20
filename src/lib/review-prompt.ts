import type { User } from "./db";

/**
 * When to ask somebody what they make of the app.
 *
 * Two conditions, and both have to hold. Three sessions says they came back;
 * five working days says enough of their working life has passed to have used
 * it in it. Either alone is easy to hit without forming a view — three logins
 * can happen in an afternoon, and five days can pass with the tab never
 * opened.
 *
 * Asked once. Whether somebody answers or waves it away, rating_asked_at is
 * set and the question does not come back: a prompt that returns is not a
 * question, it is a nag.
 */
export const LOGINS_REQUIRED = 3;
export const WORKING_DAYS_REQUIRED = 5;

/**
 * Weekdays strictly after a date, up to and including today.
 *
 * Bank holidays are not excluded. Doing so would need a calendar of them per
 * nation of the UK, kept up to date forever, to move a prompt by one day.
 */
export function workingDaysSince(iso: string, now: Date = new Date()): number {
  const start = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (isNaN(start.getTime())) return 0;

  const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const days = Math.floor((today.getTime() - start.getTime()) / 86400000);
  if (days <= 0) return 0;
  // Any ten consecutive days hold at least six weekdays, so past that there is
  // nothing left to decide and no reason to walk a year of dates.
  if (days >= 10) return WORKING_DAYS_REQUIRED * 2;

  let count = 0;
  for (let i = 1; i <= days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

export function shouldAskForReview(user: User, now: Date = new Date()): boolean {
  if (user.rating_asked_at) return false;
  if ((user.login_count ?? 0) < LOGINS_REQUIRED) return false;
  return workingDaysSince(user.created_at, now) >= WORKING_DAYS_REQUIRED;
}
