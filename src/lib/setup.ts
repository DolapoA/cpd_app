import type { User } from "./db";

/**
 * What a new account still has to do, and how far along it is.
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
 * The rest are suggestions. Counting two-factor authentication or a subscribed
 * calendar toward completeness would leave most people permanently at 80% and
 * permanently nagged, which teaches them to ignore the thing entirely.
 */
export type SetupStep = {
  key: string;
  label: string;
  /** Why it is worth doing, in the user's terms rather than the schema's. */
  detail: string;
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
      detail: "It decides the guidance you see, and who you share events with.",
      href: "/profile",
      done: !!user.profession,
    },
    {
      key: "regulator",
      label: "Add your regulator",
      detail: "This is what lets us produce the right audit or appraisal pack for you.",
      href: "/profile",
      done: !!user.regulator,
    },
    {
      key: "registration",
      label: "Add your registration number and date",
      detail:
        "The number appears on your audit pack. The date tells us which activity can count toward this registration.",
      href: "/profile",
      done: !!user.registration_number && !!user.registration_date,
    },
    {
      key: "target",
      label: "Set your annual target",
      detail: "So the dashboard can tell you whether you are on course, not just what you've done.",
      href: "/profile",
      // Everyone starts on the default 50, so this is only "done" once it has
      // been considered — which a changed value is the only evidence of.
      done: user.annual_target_points !== 50,
    },
  ];

  const suggestions: SetupStep[] = [
    {
      key: "record",
      label: "Bring your existing CPD across",
      detail:
        "Import the spreadsheet you already keep, or log an activity by hand. Your history moves in one go.",
      href: "/record/import",
      done: counts.entries > 0,
    },
    {
      key: "planned",
      label: "Add something you're going to",
      detail:
        "A conference or study day you already know about. When the date passes we'll ask whether to add it to your record.",
      href: "/record/planned",
      done: counts.plans > 0,
    },
    {
      key: "calendar",
      label: "Put your plans in your own calendar",
      detail: "Subscribe once and they appear in Google, Apple or Outlook, and stay in step.",
      href: "/record/planned",
      done: !!user.calendar_token && counts.plans > 0,
    },
    {
      key: "recovery",
      label: "Add a recovery email",
      detail:
        "A second address to reset your password from — worth having if you signed up with a work one you might leave.",
      href: "/account",
      done: !!user.backup_email_verified_at,
    },
    {
      key: "2fa",
      label: "Turn on two-factor authentication",
      detail: "Your CPD record is evidence for your regulator. A password alone is thin protection.",
      href: "/account/two-factor",
      done: !!user.totp_confirmed_at,
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
