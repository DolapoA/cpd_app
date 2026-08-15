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
  html?: string
): Promise<void> {
  if (!emailConfigured()) {
    console.warn(
      `[email] RESEND_API_KEY not set — not sending "${subject}" to ${to}.\n${text}`
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

export type FeedbackReport = {
  kind: string;
  message: string;
  /** Where they were when they hit it — far more useful than asking them. */
  page: string | null;
  /** Only if they are signed in or chose to give one. */
  from: string | null;
  userAgent: string | null;
};

export async function sendFeedbackReport(report: FeedbackReport): Promise<void> {
  const subject = `[CPD Register] ${report.kind}${report.page ? ` — ${report.page}` : ""}`;
  if (!FEEDBACK_TO) {
    console.warn(`[feedback] FEEDBACK_TO is not set — report not delivered.\n${subject}\n${report.message}`);
    return;
  }
  await send(
    FEEDBACK_TO,
    subject,
    `${report.message}

—
Kind:    ${report.kind}
Page:    ${report.page ?? "not given"}
From:    ${report.from ?? "not given"}
Browser: ${report.userAgent ?? "not given"}
Sent:    ${new Date().toISOString()}`,
    // So a reply goes to the person who reported it, not into the void.
    report.from ?? undefined
  );
}

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

This is a test release, so please keep your own copy of anything you would not
want to lose.

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
