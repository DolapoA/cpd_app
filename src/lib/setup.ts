import type { User } from "./db";

/**
 * What a new account still has to do, and how far along it is.
 *
 * The annual target is not here either. Plenty of regulators set no number —
 * the HCPC asks for a mixture of learning rather than an amount — so a list
 * that asks everyone for one would be asking most people to invent a figure
 * in order to clear an item.
 *
 * Confirming the email address is not here: nothing can be reached without it,
 * so it is a gate rather than a step, and listing something already enforced
 * would put an item on the list that can never be outstanding while the list
 * is visible.
 *
 * Two kinds of step, deliberately not mixed in the score. Profile steps are
 * things the app cannot work properly without knowing — without a regulator it
 * cannot offer the right audit pack, and without a registration date it cannot
 * tell which activity counts. Those are what the percentage measures, so
 * finishing them reaches 100% and the prompt goes away for good.
 *
 * The rest are suggestions, and deliberately outside the score. Counting a
 * subscribed calendar toward completeness would leave most people permanently
 * short of it and permanently nagged, which teaches them to ignore the thing
 * entirely. Security settings are not listed at all: the account page is where
 * they belong, and a checklist that asks for them turns a considered decision
 * into a chore to clear.
 */
export type SetupStep = {
  key: string;
  label: string;
  href: string;
  done: boolean;
};

export type SetupState = {
  profile: SetupStep[];
  suggestions: SetupStep[];
  /** Profile steps only — see above. */
  completed: number;
  total: number;
  percent: number;
  complete: boolean;
};

export type SetupCounts = {
  entries: number;
  plans: number;
  registers: number;
};

export function setupState(user: User, counts: SetupCounts): SetupState {
  const profile: SetupStep[] = [
    {
      key: "profession",
      label: "Add your profession",
      href: "/profile",
      done: !!user.profession,
    },
    {
      key: "regulator",
      label: "Add your regulator",
      href: "/profile",
      done: !!user.regulator,
    },
    {
      key: "registration",
      label: "Add your registration number and date",
      href: "/profile",
      done: !!user.registration_number && !!user.registration_date,
    },
  ];

  const suggestions: SetupStep[] = [
    {
      key: "record",
      label: "Bring your existing CPD across",
      href: "/record/import",
      done: counts.entries > 0,
    },
    {
      key: "planned",
      label: "Add something you're going to",
      href: "/record/planned",
      done: counts.plans > 0,
    },
    {
      key: "calendar",
      label: "Put your plans in your own calendar",
      href: "/record/planned",
      done: !!user.calendar_token && counts.plans > 0,
    },
  ];

  const completed = profile.filter((s) => s.done).length;
  return {
    profile,
    suggestions,
    completed,
    total: profile.length,
    percent: Math.round((completed / profile.length) * 100),
    complete: completed === profile.length,
  };
}
