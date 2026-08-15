import Link from "next/link";

export const metadata = {
  title: "Terms of use",
  description:
    "Terms for using CPD Register: what the service does, what it does not claim to do, and your responsibilities when signing or organising an attendance register.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

const UPDATED = "13 August 2026";

export default function TermsPage() {
  return (
    <main className="container container--narrow stack">
      <div className="page-head">
        <div>
          <h1>Terms of use</h1>
          <p>Last updated {UPDATED}.</p>
        </div>
      </div>

      <div className="notice notice--warn">
        <h3 className="notice__title">This is a test release</h3>
        <p className="small">
          The service is being trialled with a small group. It may change, go offline, or lose
          data. <strong>Do not rely on it as your only record of CPD.</strong> Keep your own copy —
          the account page exports everything, and the record page exports CSV.
        </p>
      </div>

      <div className="card">
        <h2>What this service does</h2>
        <p className="small">
          It records attendance at events and keeps a CPD record you can export for audit or
          appraisal. It helps you evidence CPD; it does not assess it.
        </p>
        <p className="small">
          <strong>We are not your regulator and do not speak for one.</strong> Whether your CPD
          meets your regulator&rsquo;s requirements is between you and them. Guidance shown here —
          including the activity-type mix and any framework codes — reflects published guidance at
          the time of writing and may be out of date. Check the source, which we link to.
        </p>
      </div>

      <div className="card">
        <h2>Your responsibilities</h2>
        <ul className="bullets">
          <li>Give accurate details when you sign a register. Attendance evidence is only worth something if it is true.</li>
          <li>Don&rsquo;t sign a register for an event you did not attend, or on behalf of somebody else.</li>
          <li>Keep your password to yourself, and use the account page to sign out elsewhere if you think someone has it.</li>
          <li>
            If you organise events, only create registers for events you are actually running, and
            void a signature rather than deleting it if something is wrong.
          </li>
          <li>Don&rsquo;t upload anything confidential about patients, clients or colleagues. A reflection should be about your learning, not about an identifiable person.</li>
        </ul>
      </div>

      <div className="card">
        <h2>Accounts</h2>
        <p className="small">
          You can close your account at any time from{" "}
          <Link href="/account">your account page</Link>, which explains exactly what is deleted
          and what is kept. We may suspend an account that is being used to falsify attendance
          records.
        </p>
      </div>

      <div className="card">
        <h2>Availability and liability</h2>
        <p className="small">
          The service is provided as it is, with no guarantee of availability or of fitness for a
          particular purpose. During testing in particular, please keep your own exported copy of
          anything you would not want to lose.
        </p>
      </div>

      <p className="muted small">
        See also our <Link href="/privacy">privacy notice</Link>.
      </p>
    </main>
  );
}
