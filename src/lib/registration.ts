/**
 * CPD completed before a user joined their register cannot count toward that
 * registration. The date is optional — plenty of users won't know it offhand,
 * and the record has to work without it — so every helper here treats a missing
 * date as "no cut-off applies" rather than blocking anything.
 *
 * Activity on the registration date itself counts: someone registering on the
 * morning of a study day should get the study day.
 */

export function countsTowardCpd(
  activityDate: string,
  registrationDate: string | null | undefined
): boolean {
  if (!registrationDate) return true;
  return activityDate >= registrationDate;
}

/**
 * The start of a compliance period, never earlier than the user joined the
 * register. A newly registered professional's two-year audit window starts when
 * they registered, not two years before it.
 */
export function clampToRegistration(
  from: string,
  registrationDate: string | null | undefined
): string {
  if (!registrationDate) return from;
  return from < registrationDate ? registrationDate : from;
}

export function splitByRegistration<T extends { activity_date: string }>(
  entries: T[],
  registrationDate: string | null | undefined
): { counting: T[]; beforeRegistration: T[] } {
  const counting: T[] = [];
  const beforeRegistration: T[] = [];
  for (const entry of entries) {
    if (countsTowardCpd(entry.activity_date, registrationDate)) counting.push(entry);
    else beforeRegistration.push(entry);
  }
  return { counting, beforeRegistration };
}
