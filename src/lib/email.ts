import "server-only";
import { Resend } from "resend";
import { renderEmail, type EmailBlock } from "./email-template";

/**
 * Outbound email.
 *
 * Without RESEND_API_KEY nothing is sent and the link is logged instead, so
 * local development works without an account and a misconfigured deployment
 * fails loudly in the logs rather than silently dropping a reset link.
 */
const FROM = process.env.EMAIL_FROM ?? "CPD Register <onboarding@resend.dev>";

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

async function send(
  to: string,
  subject: string,
  text: string,
  replyTo?: string,
  html?: string,
  attachments?: FeedbackAttachment[]
): Promise<void> {
  if (!emailConfigured()) {
    // The HTML part is summarised rather than dumped: several thousand
    // characters of table markup would bury the link, which is the thing
    // anyone reading this log actually needs. But it is named, because a log
    // showing only plain text reads as though no HTML was built.
    console.warn(
      `[email] RESEND_API_KEY not set — not sending "${subject}" to ${to}.` +
        `${html ? ` (multipart: ${html.length} chars of HTML, plain text below)` : ""}` +
        `${attachments?.length ? ` (${attachments.length} attachment(s))` : ""}` +
        `\n${text}`
    );
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    // Sent multipart: a client that refuses HTML still gets the full message.
    text,
    ...(html ? { html } : {}),
    ...(replyTo ? { replyTo } : {}),
    ...(attachments?.length
      ? { attachments: attachments.map((a) => ({ filename: a.filename, content: a.content })) }
      : {}),
  });
  if (error) throw new Error(`Sending email failed: ${error.message}`);
}

export async function sendPasswordReset(to: string, name: string, url: string): Promise<void> {
  const text = `Hello ${name},

Someone asked to reset the password for your CPD Register account. If that was
you, open this link within the next hour:

${url}

If it wasn't you, nothing has changed and you can ignore this email. Your
current password still works.

CPD Register`;

  await send(
    to,
    "Reset your CPD Register password",
    text,
    undefined,
    renderEmail({
      title: "Reset your password",
      preheader: "A link to set a new password. It expires in an hour.",
      blocks: [
        { kind: "text", content: `Hello ${name},` },
        {
          kind: "text",
          content:
            "Someone asked to reset the password for your CPD Register account. If that was you, set a new one here.",
        },
        { kind: "button", label: "Set a new password", url },
        { kind: "fallbackUrl", url },
        {
          kind: "note",
          content:
            "The link works for one hour and once only. If it wasn't you, nothing has changed and your current password still works — you can ignore this.",
        },
      ],
    })
  );
}

/**
 * Where user reports go. Set in the environment and nowhere else — the
 * repository is public, so a default here would put the address on GitHub,
 * which is the same scraping exposure as rendering it into a page.
 *
 * If it is unset the report is logged rather than dropped, so a
 * misconfiguration costs you a look at the logs, not somebody's bug report.
 */
const FEEDBACK_TO = process.env.FEEDBACK_TO;

export type FeedbackAttachment = { filename: string; content: Buffer };

export type FeedbackReport = {
  kind: string;
  message: string;
  /** Where they were when they hit it — far more useful than asking them. */
  page: string | null;
  /** Only if they are signed in or chose to give one. */
  from: string | null;
  userAgent: string | null;
  /** A screenshot, where one was given. Usually worth more than the words. */
  attachment: FeedbackAttachment | null;
};

export async function sendFeedbackReport(report: FeedbackReport): Promise<void> {
  const subject = `[CPD Register] ${report.kind}${report.page ? ` — ${report.page}` : ""}`;
  if (!FEEDBACK_TO) {
    console.warn(`[feedback] FEEDBACK_TO is not set — report not delivered.\n${subject}\n${report.message}`);
    return;
  }
  const facts = [
    `Kind: ${report.kind}`,
    `Page: ${report.page ?? "not given"}`,
    `From: ${report.from ?? "not given"}`,
    `Browser: ${report.userAgent ?? "not given"}`,
    `Sent: ${new Date().toISOString()}`,
    ...(report.attachment ? [`Attached: ${report.attachment.filename}`] : []),
  ];

  await send(
    FEEDBACK_TO,
    subject,
    `${report.message}

—
${facts.join("\n")}`,
    // So a reply goes to the person who reported it, not into the void.
    report.from ?? undefined,
    // Themed like everything else. The report is read on a phone as often as
    // anywhere, and the person's own words want separating from the
    // diagnostics rather than running into them as one block of plain text.
    renderEmail({
      title: report.kind,
      preheader: report.message.slice(0, 120),
      blocks: [
        { kind: "text", content: report.message },
        { kind: "list", heading: "Where it came from", items: facts },
      ],
    }),
    report.attachment ? [report.attachment] : undefined
  );
}

/* ---------------------------------------------------------------------------
   TEMPORARY — user acceptance testing only. Delete this block after acceptance,
   along with the uat_submissions table and /api/uat.
--------------------------------------------------------------------------- */

/** One row of the tester's script, exactly as the standalone form sends it. */
export type UatResult = {
  id: string;
  area: string;
  priority: string;
  title: string;
  qa_only: string;
  result: string;
  severity: string;
  notes: string;
};

export type UatSubmission = {
  meta: {
    name: string;
    role: string;
    profession: string;
    device: string;
    browser: string;
    date: string;
  };
  summary: { pass: number; fail: number; block: number; left: number; total: number };
  verdict: string;
  /** The app as a whole, rather than any one scenario. Optional throughout. */
  review?: {
    rating: number;
    text: string;
    /** Nothing is quotable without this, and it defaults to false. */
    consent: boolean;
    attribution: string;
  };
  results: UatResult[];
  generatedAt: string;
};

/**
 * A completed UAT run, to whoever is collating them.
 *
 * Unlike feedback this one does default its recipient in code: the address is
 * already public on the site, and a test run that goes nowhere because an
 * environment variable was missed is a tester's afternoon wasted.
 *
 * The failures are written into the body rather than left in the attachment,
 * because that is the part anyone acts on — and a JSON file is not something
 * you read on a phone between clinics. The attachment carries everything else.
 */
export async function sendUatSubmission(submission: UatSubmission): Promise<void> {
  const to = process.env.UAT_TO ?? "info@cpdregister.app";
  const { meta, summary, verdict, results, review } = submission;
  const tester = meta.name?.trim() || "Anonymous tester";

  const line = (r: UatResult) =>
    [
      `${r.id} — ${r.title}`,
      [r.severity, r.priority].filter(Boolean).join(" / "),
      r.area,
      r.notes?.trim() || "no notes",
    ]
      .filter(Boolean)
      .join(" · ");

  const failures = results.filter((r) => r.result?.toLowerCase() === "fail");
  const blocked = results.filter((r) => r.result?.toLowerCase() === "block");

  const environment = [
    `Tester: ${tester}${meta.role ? ` (${meta.role})` : ""}`,
    `Profession: ${meta.profession || "not given"}`,
    `Device: ${meta.device || "not given"}`,
    `Browser: ${meta.browser || "not given"}`,
    `Tested on: ${meta.date || "not given"}`,
  ];
  const counts = [
    `Pass: ${summary.pass}`,
    `Fail: ${summary.fail}`,
    `Blocked: ${summary.block}`,
    `Untested: ${summary.left}`,
    `Total: ${summary.total}`,
  ];

  const section = (heading: string, items: string[]) =>
    items.length ? `\n${heading}\n${items.map((i) => `  - ${i}`).join("\n")}\n` : "";

  /* Whether the sentence may be quoted is the first thing to say about it —
     ahead of the sentence itself, so nobody reads a nice line and lifts it
     without scrolling to find out they could not. */
  const rated = review && (review.rating > 0 || review.text);
  const opinion = rated
    ? [
        review.rating > 0 ? `Rated ${review.rating} out of 5` : "No rating given",
        review.text || "No review written",
        review.consent
          ? `May be quoted on the site${review.attribution ? ` as "${review.attribution}"` : " anonymously"}`
          : "NOT for publication — private feedback",
      ]
    : [];

  const text = `${tester} finished a UAT run.

Verdict: ${verdict || "not given"}

${environment.join("\n")}

${counts.join("\n")}
${section("What they made of it", opinion)}${section("Failures", failures.map(line))}${section("Blocked", blocked.map(line))}
The full results are attached as JSON.`;

  const blocks: EmailBlock[] = [
    { kind: "text", content: `${tester} finished a UAT run.` },
    { kind: "text", content: `Verdict: ${verdict || "not given"}` },
    { kind: "list", heading: "Counts", items: counts },
    ...(opinion.length
      ? ([{ kind: "list", heading: "What they made of it", items: opinion }] as EmailBlock[])
      : []),
    ...(failures.length
      ? ([{ kind: "list", heading: "Failures", items: failures.map(line) }] as EmailBlock[])
      : []),
    ...(blocked.length
      ? ([{ kind: "list", heading: "Blocked", items: blocked.map(line) }] as EmailBlock[])
      : []),
    { kind: "list", heading: "Where it was tested", items: environment },
    { kind: "note", content: "The full results are attached as JSON." },
  ];

  // Filename-safe, because a tester's name is free text and an attachment is
  // written straight to somebody's disk.
  const slug = (s: string) => (s.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") || "unknown");

  await send(
    to,
    `[CPD Register UAT] ${tester} — ${verdict || "no verdict"}`,
    text,
    undefined,
    renderEmail({
      title: "UAT results",
      preheader: `${summary.pass} pass, ${summary.fail} fail, ${summary.block} blocked.`,
      blocks,
    }),
    [
      {
        filename: `uat_${slug(tester)}_${slug(meta.date || "undated")}.json`,
        content: Buffer.from(JSON.stringify(submission, null, 2), "utf8"),
      },
    ]
  );
}

/* --------------------------------------------------------------------------- */

export async function sendEmailConfirmation(to: string, name: string, url: string): Promise<void> {
  const title = "Confirm your email";
  // The one email a new account holder has to open, so it carries the
  // orientation rather than sending a separate welcome minutes later.
  const orientation = [
    "Sign a register at your next event and it lands on your record for you, marked platform-verified.",
    "Already keep a spreadsheet? Import it and your history moves across in one go.",
    "When your regulator asks, export the whole record — or a dated audit pack.",
  ];

  const text = `Hello ${name},

Confirm this address so attendance you sign at events can be added to your CPD
record automatically:

${url}

The link works for 24 hours. If you didn't create a CPD Register account, you
can ignore this email.

Once you're in:
${orientation.map((o) => `  - ${o}`).join("\n")}

CPD Register`;

  const blocks: EmailBlock[] = [
    { kind: "text", content: `Hello ${name},` },
    {
      kind: "text",
      content:
        "Confirm this address so attendance you sign at events can be added to your CPD record automatically.",
    },
    { kind: "button", label: "Confirm my email", url },
    { kind: "fallbackUrl", url },
    { kind: "list", heading: "Once you're in", items: orientation },
    {
      kind: "note",
      content:
        "The link works for 24 hours. If you didn't create a CPD Register account, you can ignore this email — nothing was set up.",
    },
  ];

  await send(
    to,
    "Confirm your email for CPD Register",
    text,
    undefined,
    renderEmail({
      title,
      preheader: "One click to confirm, and your attendance records itself from here.",
      blocks,
    })
  );
}

export async function sendEmailChangeConfirmation(
  to: string,
  name: string,
  url: string,
  currentEmail: string
): Promise<void> {
  const text = `Hello ${name},

You asked to change the email address on your CPD Register account from
${currentEmail} to this one. Confirm it here:

${url}

Until you do, nothing changes and you carry on signing in with ${currentEmail}.
The link works for 24 hours.

If you weren't expecting this, ignore it — whoever sent it cannot complete the
change without this link.

CPD Register`;

  await send(
    to,
    "Confirm your new email for CPD Register",
    text,
    undefined,
    renderEmail({
      title: "Confirm your new address",
      preheader: "One click and this becomes the address you sign in with.",
      blocks: [
        { kind: "text", content: `Hello ${name},` },
        {
          kind: "text",
          content: `You asked to change the email on your CPD Register account from ${currentEmail} to this one.`,
        },
        { kind: "button", label: "Confirm this address", url },
        { kind: "fallbackUrl", url },
        {
          kind: "note",
          content: `The link works for 24 hours. Until you use it nothing changes and you carry on signing in with ${currentEmail}. If you weren't expecting this, ignore it — the change cannot happen without this link.`,
        },
      ],
    })
  );
}

/**
 * Sent to the address being replaced. It carries no link on purpose: its job
 * is to warn, and the only useful action for someone who did not ask for this
 * is to secure the account, not to click something in an email they distrust.
 */
export async function sendEmailChangeNotice(
  to: string,
  name: string,
  newEmail: string
): Promise<void> {
  const text = `Hello ${name},

Someone asked to change the email address on your CPD Register account to
${newEmail}. It will only take effect once that address is confirmed.

If that was you, there is nothing to do.

If it wasn't, someone may have your password. Change it now at
cpdregister.app, and turn on two-factor authentication while you are there.

CPD Register`;

  await send(
    to,
    "Your CPD Register email is being changed",
    text,
    undefined,
    renderEmail({
      title: "Your email is being changed",
      preheader: "If this wasn't you, someone may have your password.",
      blocks: [
        { kind: "text", content: `Hello ${name},` },
        {
          kind: "text",
          content: `Someone asked to change the email address on your CPD Register account to ${newEmail}. It only takes effect once that address is confirmed.`,
        },
        {
          kind: "note",
          content:
            "If that was you, there is nothing to do. If it wasn't, someone may have your password — change it, and turn on two-factor authentication while you are there.",
        },
      ],
    })
  );
}

export async function sendRecoveryConfirmation(
  to: string,
  name: string,
  url: string,
  accountEmail: string
): Promise<void> {
  const text = `Hello ${name},

This address was added as the recovery address for the CPD Register account
belonging to ${accountEmail}. Confirm it here:

${url}

Once confirmed, you can use it to reset that account's password if you ever
lose access to ${accountEmail} — which is what makes it worth confirming now,
while you still can.

The link works for 24 hours. If you don't know what this is, ignore it: an
unconfirmed address can do nothing.

CPD Register`;

  await send(
    to,
    "Confirm your recovery address for CPD Register",
    text,
    undefined,
    renderEmail({
      title: "Confirm your recovery address",
      preheader: "So you can still get in if you lose your main address.",
      blocks: [
        { kind: "text", content: `Hello ${name},` },
        {
          kind: "text",
          content: `This address was added as the recovery address for the CPD Register account belonging to ${accountEmail}.`,
        },
        { kind: "button", label: "Confirm this address", url },
        { kind: "fallbackUrl", url },
        {
          kind: "note",
          content: `Once confirmed you can use it to reset that account's password if you lose access to ${accountEmail} — worth doing now, while you still can. If you don't know what this is, ignore it: an unconfirmed address can do nothing.`,
        },
      ],
    })
  );
}

export type PlanReminder = {
  title: string;
  when: string;
  location: string | null;
  provider: string | null;
  url: string | null;
};

/**
 * The day before.
 *
 * Sent because a calendar cannot be relied on to do it: an alarm inside a
 * subscribed feed is a suggestion, and Google ignores it outright. This is the
 * one channel that reaches everybody, whatever they subscribed with.
 */
export async function sendPlanReminder(
  to: string,
  name: string,
  events: PlanReminder[]
): Promise<void> {
  const one = events.length === 1;
  const subject = one ? `Tomorrow: ${events[0].title}` : `${events.length} things tomorrow`;

  const line = (e: PlanReminder) =>
    [e.title, e.when, [e.provider, e.location].filter(Boolean).join(" · ")]
      .filter(Boolean)
      .join(" — ");

  const text = `Hello ${name},

${one ? "This is on your plan for tomorrow:" : "These are on your plan for tomorrow:"}

${events.map((e) => `  - ${line(e)}${e.url ? `\n    ${e.url}` : ""}`).join("\n\n")}

After it happens we'll ask whether you attended, and add it to your CPD record
if you did.

CPD Register`;

  await send(
    to,
    subject,
    text,
    undefined,
    renderEmail({
      title: one ? "Tomorrow" : "Tomorrow on your plan",
      preheader: one ? line(events[0]) : `${events.length} planned events tomorrow.`,
      blocks: [
        { kind: "text", content: `Hello ${name},` },
        {
          kind: "list",
          heading: one ? "On your plan for tomorrow" : "On your plan for tomorrow",
          items: events.map((e) => line(e)),
        },
        ...(one && events[0].url
          ? ([{ kind: "button", label: "Event details", url: events[0].url }] as EmailBlock[])
          : []),
        {
          kind: "note",
          content:
            "Once it has been and gone we'll ask whether you attended, and add it to your CPD record if you did. You can change or remove anything on your plan at any time.",
        },
      ],
    })
  );
}

/* ---------------------------------------------------------------------------
   Multi-source feedback
--------------------------------------------------------------------------- */

/**
 * A colleague's invitation to give anonymous feedback.
 *
 * Carries no message from the person asking. That is not an omission: a
 * free-text body a sender controls, delivered from our domain to addresses we
 * have never seen, is the spam vector this feature would otherwise be. The
 * email says who is asking, what it is for and when it closes, and nothing
 * else — and replies go to the colleague who asked, not to us.
 */
export async function sendMsfInvitation(
  to: string,
  from: { name: string; email: string; profession: string | null },
  url: string,
  closesOn: string,
  reminder = false
): Promise<void> {
  const who = from.profession ? `${from.name}, ${from.profession},` : `${from.name}`;
  const title = reminder ? "A reminder: feedback for a colleague" : "A colleague has asked for your feedback";
  const opening = reminder
    ? `${who} asked for your feedback a week ago and has not heard back. There is still time.`
    : `${who} is collecting feedback from colleagues as part of their professional development, and has asked for yours.`;

  const text = `${opening}

It takes about five minutes. Your answers are pooled with everyone else's and shown to ${from.name} after ${closesOn}. Your name and email address are not stored with your answers — they cannot be, so nobody can work out which reply was yours.

${url}

The link is yours alone and works once. It stops working on ${closesOn}.

CPD Register`;

  const blocks: EmailBlock[] = [
    { kind: "text", content: opening },
    {
      kind: "text",
      content:
        "It takes about five minutes, and it is anonymous — your answers are pooled with everyone else's before anyone sees them.",
    },
    { kind: "button", label: "Give your feedback", url },
    { kind: "fallbackUrl", url },
    {
      kind: "list",
      heading: "What happens to your answers",
      items: [
        `They are shown to ${from.name} after ${closesOn}, together with everyone else's.`,
        "Your name and email address are not stored alongside them, so no reply can be traced back to you.",
        "Written comments are passed on word for word, so write them as you would want them read.",
      ],
    },
    {
      kind: "note",
      content: `This link is yours alone, works once, and stops working on ${closesOn}. If you would rather not take part, simply ignore this — ${from.name} is told how many people replied, never who.`,
    },
  ];

  await send(
    to,
    reminder ? `Reminder: ${from.name} would still value your feedback` : `${from.name} has asked for your feedback`,
    text,
    from.email,
    renderEmail({
      title,
      preheader: `Five minutes, anonymous, open until ${closesOn}.`,
      blocks,
    })
  );
}
