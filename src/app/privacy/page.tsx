import Link from "next/link";

export const metadata = {
  title: "Privacy",
  description:
    "What CPD Register holds about you, why, how long for, and how to remove it. Written plainly, including what closing your account does not delete and why.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

const UPDATED = "13 August 2026";

export default function PrivacyPage() {
  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Privacy</h1>
          <p>What we hold, why, and how to get rid of it. Last updated {UPDATED}.</p>
        </div>
      </div>

      <div className="card">
        <h2>What we hold</h2>
        <ul className="bullets">
          <li>
            <strong>Your account</strong> — name, email address, and optionally a backup address,
            profession, regulator, registration number, role or grade, and registration date.
          </li>
          <li>
            <strong>Your CPD record</strong> — the activities you log or import, including any
            reflection you write. Reflection can be personal; it is shown to nobody but you unless
            you export or print it yourself.
          </li>
          <li>
            <strong>Attendance</strong> — when you sign a register: your name, email, and the
            professional body and registration number you give, with a server timestamp.
          </li>
          <li>
            <strong>Registers you organise</strong> — the event details you enter, and the
            signatures of people who attend.
          </li>
          <li>
            <strong>Sign-in</strong> — a password stored only as a bcrypt hash, session tokens, and
            a short-lived count of failed sign-in attempts used to slow down guessing.
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>What we don&rsquo;t hold</h2>
        <p className="small">
          Event feedback is stored with <strong>no link to the person who gave it</strong> — not a
          hidden one, none at all — and only the date, not the time. That is deliberate: it means
          feedback cannot be traced back to you by an organiser, by us, or by anyone who obtained
          the database. It also means we cannot retrieve your own feedback for you, because there
          is nothing identifying it.
        </p>
        <p className="small">
          There is no advertising, no analytics or tracking pixels, and no third-party sharing.
          Cookies are limited to the ones that make signing in work.
        </p>
      </div>

      <div className="card">
        <h2>Who can see it</h2>
        <ul className="bullets">
          <li>Your CPD record is visible only to you.</li>
          <li>
            An organiser sees the details you give when you sign their register — that is the point
            of a register, and it is what makes your attendance evidence.
          </li>
          <li>
            An attendance slip carries a verification code. Anyone you give that code to can
            confirm the attendance is genuine, and can download the slip, which shows your name,
            email and registration number. Share the code only with people you intend to.
          </li>
          <li>
            Organisers see feedback for their event as anonymous totals and comments, never who
            said what.
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>How long, and how to remove it</h2>
        <p className="small">
          We keep your data while your account exists. You can{" "}
          <Link href="/account">download everything</Link> as a JSON file at any time, and close
          your account from the same page.
        </p>
        <p className="small">
          Closing your account deletes your profile, sign-in and CPD record. Two things are kept
          and stated plainly before you confirm: attendances you signed on other people&rsquo;s
          registers are <strong>anonymised rather than deleted</strong>, and registers you
          organised are kept and closed. Both are other people&rsquo;s evidence — removing them
          would alter an organiser&rsquo;s record of who attended and invalidate slips already
          issued to auditors.
        </p>
      </div>

      <div className="card">
        <h2>Your rights</h2>
        <p className="small">
          Under UK GDPR you can ask for a copy of your data, correct it, or ask us to delete it —
          the account page does all three without needing to ask. You can also complain to the{" "}
          <a href="https://ico.org.uk/" target="_blank" rel="noreferrer">
            Information Commissioner&rsquo;s Office
          </a>
          .
        </p>
        <p className="hint">
          This service is in testing. If anything here is unclear or you want data removed in a way
          the account page doesn&rsquo;t cover, contact us and we will do it by hand.
        </p>
      </div>
    </main>
  );
}
