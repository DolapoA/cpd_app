# CPD Register

A web app for Continuing Professional Development. Attendance capture, spreadsheet import and the
CPD record work for any profession; HCPC audit packs and GMC appraisal summaries are shown only to
users registered with those specific bodies (chosen at signup, editable in Profile). This is the
v1.0 MVP: the complete capture-to-evidence loop.

## What it does

- **Attendance registers** — organisers create a register for an event (official/accredited or
  unofficial CPD), share it via URL or QR code (including a full-screen projector mode), and it
  opens/closes automatically around the event so signatures are credible evidence.
- **Guest sign-in** — attendees scan, enter their details, and download a PDF attendance slip.
  No account required.
- **Account holders** — signing is one tap with pre-filled details, and the attendance is added
  to their CPD record automatically, marked *platform-verified*. Guest signatures are claimed
  retroactively when an account is created with the same email.
- **Verification** — every slip carries a `CPD-XXXX-XXXX-XXXX` code checkable at a public
  `/verify/<code>` URL, so appraisers and auditors can confirm authenticity.
- **CPD record** — platform-verified attendances plus self-reported entries (using the HCPC's
  activity-type mix), with a dashboard tracking points against an annual target. An optional
  registration date on the profile marks where CPD starts counting: earlier activity is kept and
  shown but not totalled, and compliance periods never start before you joined the register.
- **Spreadsheet import** — migrate an existing CPD record from a CSV or Excel file, with flexible
  header matching, a preview before anything is written, and clear per-row rejection reasons.
- **Per-activity classification** — where a body mandates one (GDC development outcomes, NMC Code
  themes, GPhC planned/unplanned, RICS and FCA structured/unstructured, ARB topics, RIBA core
  curriculum), every entry must carry a code and untagged entries are surfaced as a to-do. Bodies
  that don't mandate one — including HCPC, whose standards are obligations on the registrant rather
  than attributes of an activity — are never asked.
- **Event feedback** — organisers can collect five rated questions and an optional comment,
  asked *after* attendance is recorded so it never blocks sign-in. Responses are stored with no
  link back to the attendee and no clock time, so they can't be attributed; below five responses
  the organiser sees a small-sample caution. Account holders can additionally keep their own
  answers as a private reflection on their CPD record. The questions and the
  scale follow published evidence on post-event reaction measures.
- **Compliance exports** — one-click printable HCPC audit pack (two-year cycle) and GMC
  appraisal summary (twelve months), shown only to users whose profile regulator is HCPC or GMC
  respectively; everyone else gets a plain CSV export instead. Profession and regulator (with an
  "Other" option) are captured at signup and editable in Profile.
- **Integrity** — signatures are server-timestamped and immutable; organisers can void (never
  edit or delete) a signature, with the reason recorded; verified record entries cannot be deleted.
- **Account management** — a backup email address, password change (which ends every other
  session), a list of where you are signed in with a "sign out everywhere else" control, a full
  JSON export of everything the account holds, and account closure. Closure states plainly what it
  does: your profile and CPD record are deleted, but attendances you signed are anonymised rather
  than removed, and registers you organised are kept and closed — both are other people's
  evidence, and deleting them would silently alter an organiser's register and break every
  verification code already issued.
- **Guest to account in one step** — after signing, an attendee is offered an account with their
  name, email, body and registration number already filled in from the register; only a password
  is left to enter, and the page names the event that will be saved. The slip is claimed by its
  verification code as well as by email, so changing the pre-filled address does not lose it.

## Interface

- **Design tokens** — `src/app/globals.css` opens with a two-layer token block: primitives
  (raw values) that only the semantic layer references, and semantic names (`--surface`, `--ink`,
  `--space-4`, `--text-l`…) that everything else uses. No rule below `:root` may use a primitive
  or a colour literal, which is what makes a theme or a change of visual direction an edit to that
  one block. A dark-mode scaffold is enumerated there, commented out.
- **Layout owns spacing** — `.stack` spaces a page's children and a flow rule spaces a card's, so
  no element carries a margin to compensate for what sits next to it.
- **Cards versus notices** — `.card` is for "here is a thing"; `.notice` (flat, coloured left
  rule) is for "this needs your attention", so a warning no longer looks like a promo.
- **Navigation** — a vertical rail beside the page on a desktop, and a bottom tab bar on a phone
  where a thumb reaches. The current section is marked, and the account sits apart from it rather
  than among the sections. Log out lives on the profile page. Signed-out and attendee-facing pages
  get a plain wordmark header instead — there is nothing to navigate yet.
- **Small screens** — wide tables stack into labelled blocks rather than scrolling sideways, and
  paired fields unstack.

## Stack

Next.js 15 (App Router, server actions) · TypeScript · Postgres (Supabase) via `pg` ·
`pdf-lib` for attendance slips · `qrcode` for sharing · Resend for email.

Supabase is used as the database only — no PostgREST and no Supabase Auth. The app owns its own
sessions and password hashing, so every query runs server-side behind a session check and the
browser never talks to the database. Statements are written with `?` placeholders and converted to
Postgres's `$1..$n` in one place, which is why moving database did not touch the call sites.

## Run it

You need a Postgres. Any will do — `supabase start`, a local install, or the hosted database:

```bash
npm install
cp .env.example .env.local        # set DATABASE_URL
createdb cpd_dev                  # if using a local Postgres
npm run dev                       # http://localhost:3000
```

The schema and migrations are applied on first connection, so there is no separate migrate step.
Without `RESEND_API_KEY` no email is sent and links are written to the server log, which is fine
locally.

## Deploying

1. **Database.** Create a Supabase project. Take the connection string from
   *Project settings → Database → Connection string*, and use the **transaction pooler** (port
   6543) rather than the direct connection (5432). A serverless function is short-lived and there
   are many of them, so direct connections exhaust Postgres's connection limit under load.

2. **Email.** Create a [Resend](https://resend.com) API key, then **add and verify your domain**
   under *Domains*. Until a domain is verified Resend only delivers to the address on your own
   account, so testers would receive neither the confirmation link nor a password reset. Set
   `EMAIL_FROM` to an address on the verified domain and `FEEDBACK_TO` to wherever problem
   reports should go. Without a key the app still runs, but links are written to the server log
   rather than sent — which in production means silent lockouts.

   Messages are sent multipart: branded HTML with the plain text as fallback. The HTML lives in
   `src/lib/email-template.ts`, which keeps its own copy of the palette because email clients
   support neither CSS custom properties nor external stylesheets.

3. **Deploy.** Import the repository into Vercel and set `DATABASE_URL`, `RESEND_API_KEY` and
   `EMAIL_FROM`. Nothing else is needed: QR codes and slip links take their origin from the
   request headers, so they work on any domain.

4. **Existing data (optional).** To bring across a database from an earlier SQLite build, let the
   app connect once so the schema exists, then:
   ```bash
   npm i -D better-sqlite3
   node scripts/import-sqlite.mjs data/cpd.db "$DATABASE_URL"
   ```
   It preserves ids so every foreign key still points where it did, advances the identity
   sequences past them, and refuses to run against a database that already has users.

Production locally: `npm run build && npm start`.

## Try the loop

Without an account: the home page carries a demo register. Sign it as a guest and you get a
real slip and a real verification code — the attendee's half of the loop. The steps below are
the organiser's half.

1. Create an account, then **My registers → New register** (set today's date and a time window
   covering now).
2. Open the register and scan the QR code with a phone (or open the `/r/<code>` link in a
   private window) and sign as a guest — download the PDF slip.
3. Visit the `/verify/<code>` URL from the slip.
4. Follow **Create a free account** from the confirmation page — the form arrives pre-filled, and
   the attendance appears in **My record**, platform-verified.
5. Generate the HCPC audit pack or GMC appraisal summary from the dashboard.
