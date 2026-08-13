import Link from "next/link";

export const metadata = { title: "Check your email" };

export default function ResetSentPage() {
  return (
    <main className="container container--narrow stack">
      <div className="card empty">
        <div className="empty__icon" aria-hidden="true">✉</div>
        <p className="empty__title">Check your email</p>
        <p>
          If that address has an account, a link to set a new password is on its way. It works for
          one hour.
        </p>
        <p className="hint">
          We say &ldquo;if&rdquo; deliberately — confirming whether an address is registered here
          would tell a stranger something about you.
        </p>
        <div className="actions-row">
          <Link href="/login" className="btn btn--secondary">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
