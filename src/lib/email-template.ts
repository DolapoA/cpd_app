import "server-only";

/**
 * HTML wrapper for outgoing email.
 *
 * Email clients do not support CSS custom properties, external stylesheets or
 * reliable flexbox, so this cannot reuse globals.css. The palette below is a
 * hand-copy of the Layer 2 tokens; if the brand colour changes there, it has
 * to change here too. That duplication is the price of HTML email and is
 * deliberately confined to this one file.
 *
 * Deliberately light-only. Clients invert colours unpredictably and their
 * prefers-color-scheme support is patchy — a light design on a white card
 * survives inversion far better than one trying to handle both.
 *
 * Every message is sent multipart: this HTML plus the plain text it was built
 * from. A client that refuses HTML still gets a complete, readable email, and
 * a plain-text reset link reads less like phishing than a styled button does.
 */

/** Copied from globals.css :root — see the note above. */
const C = {
  brand: "#0e6e6b",
  brandDark: "#0a5452",
  brandSoft: "#e3f1f0",
  ink: "#16283a",
  inkSoft: "#51667a",
  line: "#dde6ec",
  ground: "#eef2f6",
  surface: "#ffffff",
};

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export type EmailBlock =
  | { kind: "text"; content: string }
  | { kind: "button"; label: string; url: string }
  /** The same URL as plain text, for anyone whose client won't open a link. */
  | { kind: "fallbackUrl"; url: string }
  | { kind: "list"; heading: string; items: string[] }
  | { kind: "note"; content: string };

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBlock(block: EmailBlock): string {
  switch (block.kind) {
    case "text":
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${C.ink};">${escape(
        block.content
      )}</p>`;

    case "button":
      // A table cell rather than a padded anchor, because Outlook ignores
      // padding on inline elements.
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
  <tr>
    <td style="background:${C.brand};border-radius:8px;">
      <a href="${escape(block.url)}"
         style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">${escape(
           block.label
         )}</a>
    </td>
  </tr>
</table>`;

    case "fallbackUrl":
      return `<p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:${C.inkSoft};">
  Or paste this into your browser:<br>
  <span style="color:${C.brandDark};word-break:break-all;">${escape(block.url)}</span>
</p>`;

    case "list":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;">
  <tr><td style="padding:16px 18px;background:${C.brandSoft};border-radius:8px;">
    <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:${C.brandDark};">${escape(
      block.heading
    )}</p>
    ${block.items
      .map(
        (item) =>
          `<p style="margin:0 0 8px;font-size:14px;line-height:1.55;color:${C.ink};">&bull;&nbsp; ${escape(
            item
          )}</p>`
      )
      .join("\n    ")}
  </td></tr>
</table>`;

    case "note":
      return `<p style="margin:0 0 16px;font-size:13px;line-height:1.55;color:${C.inkSoft};">${escape(
        block.content
      )}</p>`;
  }
}

/**
 * @param preheader The line clients show beside the subject in the inbox.
 *                  Without one they show the first words of the body, which is
 *                  usually the greeting and tells the reader nothing.
 */
export function renderEmail({
  title,
  preheader,
  blocks,
}: {
  title: string;
  preheader: string;
  blocks: EmailBlock[];
}): string {
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escape(title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.ground};font-family:${FONT};">
<!-- Shown in the inbox preview, hidden in the message itself. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(preheader)}</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.ground};">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">

        <tr>
          <td style="padding:0 0 20px;">
            <span style="font-size:19px;font-weight:700;color:${C.brandDark};letter-spacing:-0.01em;">CPD</span><span style="font-size:19px;font-weight:700;color:${C.brand};letter-spacing:-0.01em;">Register</span>
          </td>
        </tr>

        <tr>
          <td style="background:${C.surface};border:1px solid ${C.line};border-radius:10px;padding:32px;">
            <h1 style="margin:0 0 18px;font-size:23px;line-height:1.25;font-weight:700;color:${C.ink};">${escape(
              title
            )}</h1>
            ${blocks.map(renderBlock).join("\n            ")}
          </td>
        </tr>

        <tr>
          <td style="padding:20px 4px 0;font-size:12px;line-height:1.6;color:${C.inkSoft};">
            CPD Register &middot; attendance registers and CPD records for regulated professionals.
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>
</body>
</html>`;
}
