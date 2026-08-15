import Link from "next/link";

export const metadata = { title: "Thanks", robots: { index: false, follow: false } };

export default function FeedbackThanksPage() {
  return (
    <main className="container container--narrow stack">
      <div className="card empty">
        <div className="empty__icon" aria-hidden="true">✓</div>
        <p className="empty__title">Sent — thank you</p>
        <p>
          A person reads every one of these. If you left an email address we&rsquo;ll reply,
          usually to ask something rather than to tell you it&rsquo;s fixed.
        </p>
        <div className="actions-row">
          <Link href="/dashboard" className="btn">
            Back to the app
          </Link>
        </div>
      </div>
    </main>
  );
}
