/**
 * Subscription plans.
 *
 * The shape of this follows from one decision: the individual CPD record is
 * free permanently, and money comes from the organiser side.
 *
 * That is not generosity. The individual portfolio is a commodity — CPDme is
 * £2.99/month, FourteenFish £49.99/year, and the CSP, RCOG and NHS Scotland's
 * Turas give one away with membership. Competing there means undercutting free.
 * The attendance register is the part nobody else has, it is the part with a
 * budget behind it, and every free professional makes it more valuable by
 * being someone an organiser can capture.
 *
 * Prices are annual-discounted at two months free, which is the convention
 * people recognise and quietly rewards the commitment that reduces churn.
 */

export type PlanFeature = {
  text: string;
  /** Set where a feature is not built yet, so the page cannot overclaim. */
  planned?: boolean;
};

export type Plan = {
  id: "professional" | "organiser" | "organisation";
  name: string;
  /** Who it is for, in their words rather than ours. */
  audience: string;
  priceMonthly: string;
  priceYearly: string;
  /** Shown under the price. */
  note: string;
  /** The single sentence that says why this tier exists. */
  pitch: string;
  features: PlanFeature[];
  cta: { label: string; href: string };
  /** The one people should land on. */
  featured?: boolean;
};

export const CURRENCY = "£";

export const PLANS: Plan[] = [
  {
    id: "professional",
    name: "Professional",
    audience: "Anyone with CPD to evidence",
    priceMonthly: "Free",
    priceYearly: "Free",
    note: "Free permanently, not a trial",
    pitch:
      "Everything you need to keep a record and prove it. We don't charge people for meeting an obligation their regulator already imposes.",
    // Refreshed as features ship — this list is the free tier's contract, and
    // a plan board behind the product undersells the reason the free tier
    // exists at all.
    features: [
      { text: "Unlimited CPD entries and reflections" },
      { text: "Sign any register as a guest or account holder" },
      { text: "Verifiable attendance slips, checkable by an auditor" },
      { text: "Planned CPD, with calendar subscription and phone reminders" },
      { text: "See events others in your profession are attending" },
      { text: "Spreadsheet import, with every column kept" },
      { text: "Regulator packs — HCPC audit, GMC appraisal and more" },
      { text: "Full CSV and JSON export, whenever you want it" },
      { text: "Run up to 3 registers a year" },
    ],
    cta: { label: "Create a free account", href: "/signup" },
  },
  {
    id: "organiser",
    name: "Organiser",
    audience: "Anyone who runs events",
    priceMonthly: "12",
    priceYearly: "120",
    note: "Two months free on the yearly plan",
    pitch:
      "For the teaching lead, course provider or society branch running events regularly. One session a month is already worth more than this in admin you no longer do.",
    features: [
      { text: "Unlimited registers" },
      { text: "Your logo on slips, QR codes and projector mode", planned: true },
      { text: "Custom fields on the sign-in form", planned: true },
      { text: "Attendee and feedback export" },
      { text: "Feedback trends across your events", planned: true },
      { text: "Audience composition on a register", planned: true },
      { text: "Choose how many replies open the feedback", planned: true },
      { text: "Everything in Professional, for your own record" },
    ],
    cta: { label: "Start organising", href: "/registers/new" },
    featured: true,
  },
  {
    id: "organisation",
    name: "Organisation",
    audience: "Trusts, colleges, societies, providers",
    priceMonthly: "Custom",
    priceYearly: "Custom",
    note: "From £500 a year",
    pitch:
      "For a department or body running events across many organisers, who needs the evidence to hold together across all of them.",
    features: [
      { text: "Many organisers under one account", planned: true },
      { text: "Publish events to your members", planned: true },
      { text: "Organisation branding throughout", planned: true },
      { text: "Aggregate attendance and engagement", planned: true },
      { text: "Registers restricted to members", planned: true },
      { text: "Single sign-on", planned: true },
      { text: "A named contact, and help moving your existing records across" },
    ],
    cta: { label: "Talk to us", href: "/feedback?about=/plans" },
  },
];

/**
 * Said plainly on the page. A plan board that quietly implies everything is
 * live would be the same overclaiming the compliance product exists to avoid.
 */
export const BILLING_STATUS =
  "Nothing is charged yet. While CPD Register is in testing every feature is free, including the ones marked as coming. When billing starts you will be told before anything is taken, and the Professional plan stays free.";
