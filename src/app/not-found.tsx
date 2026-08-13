import Link from "next/link";

export const metadata = { title: "Page not found — CPD Register" };

export default function NotFound() {
  return (
    <main className="container container--narrow stack">
      <div className="card empty">
        <div className="empty__icon" aria-hidden="true">◌</div>
        <p className="empty__title">Page not found</p>
        <p>
          This page doesn&rsquo;t exist, or the register or slip it pointed at has been removed.
          Check the link, or the code on your attendance slip.
        </p>
        <div className="actions-row">
          <Link href="/dashboard" className="btn">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
