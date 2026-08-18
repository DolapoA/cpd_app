"use client";

import Link from "next/link";

/**
 * Anything that throws inside a page lands here instead of a raw stack trace.
 * The message is deliberately vague about the cause — a tester does not need
 * it, and an attacker should not have it.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="container container--narrow stack">
      <div className="card empty">
        <div className="empty__icon" aria-hidden="true">◍</div>
        <p className="empty__title">Something went wrong</p>
        <p>
          That page didn&rsquo;t load. Nothing you had already saved is affected — your CPD record
          and any attendance you have signed are stored as they were.
        </p>
        {/* The cause stays hidden, but the digest is a hash of it and nothing
            else — safe to show, and the only thing that lets somebody quote
            one failure to us rather than "it broke". */}
        {error.digest && (
          <p className="muted small">
            If you report this, quote <strong>{error.digest}</strong>.
          </p>
        )}
        <div className="actions-row">
          <button type="button" className="btn" onClick={reset}>
            Try again
          </button>
          <Link href="/dashboard" className="btn btn--secondary">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
