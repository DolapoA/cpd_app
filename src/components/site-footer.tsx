import Link from "next/link";

/** Small print. Reachable from every page, which is the point of it. */
export function SiteFooter() {
  return (
    <footer className="site-footer no-print">
      <div className="site-footer__inner">
        <span className="muted small">CPD Register</span>
        <nav className="site-footer__links">
          <Link href="/cpd">CPD requirements</Link>
          <Link href="/feedback">Report a problem</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
