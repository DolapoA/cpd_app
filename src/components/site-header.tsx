import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { NavLinks } from "./nav-links";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

export async function SiteHeader() {
  const user = await getCurrentUser();

  const brand = (
    <Link href={user ? "/dashboard" : "/"} className="logo">
      CPD<span>Register</span>
    </Link>
  );

  // Signed out — the landing, login and sign-up pages. A navigation rail for
  // someone with nothing to navigate would be chrome for its own sake.
  if (!user) {
    return (
      <header className="site-header">
        <div className="site-header__inner">
          {brand}
          <nav className="site-nav">
            <Link href="/login" className="nav-link">
              Log in
            </Link>
            <Link href="/signup" className="btn btn--small">
              Create account
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  // Signed in — a vertical rail beside the page on a desktop, and a bottom tab
  // bar on a phone, where a thumb can actually reach it. Log out lives on the
  // profile page rather than in the rail: it is rare, and it is destructive
  // enough that it should not sit one mis-tap from the section you use most.
  return (
    <header className="site-header site-header--rail">
      <div className="site-rail">
        <div className="site-rail__brand">{brand}</div>
        <nav className="site-nav" aria-label="Sections">
          <NavLinks variant="icon" />
        </nav>
        <div className="site-rail__foot">
          <Link href="/profile" className="account__link">
            <span className="account__avatar" aria-hidden="true">
              {initials(user.full_name)}
            </span>
            <span className="account__name">{user.full_name.split(" ")[0]}</span>
          </Link>
          <form action={logout} className="site-rail__logout">
            <button type="submit" className="btn btn--quiet btn--small">
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
