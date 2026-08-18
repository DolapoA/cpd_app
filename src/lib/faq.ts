/**
 * The explanations that used to sit under the controls.
 *
 * Every one of these answers a real question — but a form field is a poor
 * place to answer it. Somebody changing their email already knows why they are
 * changing it; the paragraph explaining when they might want to is read once,
 * by nobody, and then sits under the field forever. Collected here, the same
 * words are available to the person who actually has the question.
 *
 * Grouped by where the question comes up rather than by subject, because that
 * is how somebody arrives at it: "I was on the account page and it asked me…".
 */
export type Faq = { q: string; a: string };
export type FaqGroup = { heading: string; questions: Faq[] };

export const FAQ_GROUPS: FaqGroup[] = [
  {
    heading: "Your account",
    questions: [
      {
        q: "Why would I change the email I sign in with?",
        a: "Because you might one day leave the address you signed up with — a work address, most often. Your CPD record, your registers and everything you have signed come with you. The change only takes effect once you open the link sent to the new address, so a typo costs you nothing but another go.",
      },
      {
        q: "What is a recovery email for?",
        a: "It is a second address you can reset your password from if you lose access to the one you sign in with. A personal address, if you sign in with a work one. It has to be confirmed before it can do anything, and it is never used to sign in.",
      },
      {
        q: "What happens when I change my password?",
        a: "You are signed out everywhere else. That is the point of changing it: if someone has been signed in on a device you no longer have, changing the password is what removes them.",
      },
      {
        q: "Should I turn on two-factor authentication?",
        a: "It adds a six-digit code from your phone to your password. Your CPD record is the evidence you show your regulator, so it is worth protecting properly. Keep the recovery codes somewhere other than that phone — without them, losing the phone means losing the account.",
      },
      {
        q: "Can I get my data out?",
        a: "Yes, at any time and without asking. Your details, every record entry and every attendance you have signed export as a JSON file, and your record also exports as a CSV you can open in a spreadsheet.",
      },
    ],
  },
  {
    heading: "Your profile",
    questions: [
      {
        q: "My regulator is not on the list.",
        a: "Choose “Other”. The regulator only decides which compliance pack you are offered — the HCPC audit pack, the GMC appraisal record and so on. Everything else works the same either way.",
      },
      {
        q: "Why does it ask for my registration date?",
        a: "It is optional. If you give it, CPD dated before it is kept and shown but not counted towards your registration, because that is how regulators treat it.",
      },
      {
        q: "Do I need an annual CPD target?",
        a: "Only if your regulator sets one. Fifty credits a year is common for doctors, thirty-five hours for financial advisers; the HCPC sets no number at all and asks for a mixture of learning instead. Leave it unticked and your dashboard counts what you have done rather than measuring it against a figure nobody asked of you.",
      },
      {
        q: "My profession is not on the list.",
        a: "Choose “Other” and type it. Use the usual name for the job rather than your job title — it is how you are matched with other people doing the same work.",
      },
      {
        q: "Why record where I have worked?",
        a: "An appraisal or an audit covers a period, and a period can span more than one job. The profile holds your current role; the history holds the rest.",
      },
    ],
  },
  {
    heading: "Your record",
    questions: [
      {
        q: "What does platform-verified mean?",
        a: "It was captured live on a register at the event and signed by you at the time. That is stronger evidence than anything typed in afterwards, which is why those entries cannot be edited or deleted.",
      },
      {
        q: "Why can I not delete some entries?",
        a: "Platform-verified entries are somebody else's record too — the organiser ran the register and your attendance is part of it. Everything you added yourself can be deleted.",
      },
      {
        q: "My spreadsheet will not import properly.",
        a: "Only a date and a title are required; everything else can be blank. Column names vary hugely between employers, so if yours is not recognised, tell us what it looks like and the matching gets better for everyone.",
      },
    ],
  },
  {
    heading: "Registers, events and reminders",
    questions: [
      {
        q: "What makes an event “official”?",
        a: "That it is accredited by a body which awards points. Official events need the accrediting body and the points named, and both appear on every slip so an auditor can check them.",
      },
      {
        q: "How does event feedback work?",
        a: "Five ratings and an optional comment, asked after someone has signed in so it never blocks the signing. Answers reach you without names attached.",
      },
      {
        q: "Who can see the events I share?",
        a: "Only people in your own profession, and only the event — never who added it. Counts are of people, not of names.",
      },
      {
        q: "When do notifications arrive?",
        a: "At one time of day that you choose, in UK time, for all three kinds together rather than as three separate interruptions. They need the app installed on your phone.",
      },
    ],
  },
];
