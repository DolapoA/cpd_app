"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { SECTIONS } from "@/lib/sections";
import { NavIcon } from "./nav-icons";

/**
 * A link that has been clicked but not yet arrived.
 *
 * Rendered inside the Link, which is the only place useLinkStatus can read a
 * navigation's state. It answers the "did that click do anything?" question in
 * the ~200ms before the next page paints, on the exact thing that was clicked
 * rather than in a bar somewhere else on the screen.
 */
function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="nav-link__pending" aria-hidden="true" /> : null;
}

/**
 * Section links that know which one you are on. Client-side only because the
 * current path is the one thing a server component cannot see.
 *
 * Both labels are rendered and CSS chooses between them, since the rail and
 * the phone tab bar are the same markup at different widths.
 */
export function NavLinks({ variant = "full" }: { variant?: "full" | "short" | "icon" }) {
  const pathname = usePathname();

  // Longest match wins, and only one wins: /record/development belongs to the
  // PDP tab, not to My Record as well, and a plain prefix test would light
  // both. (/record vs /registers is why it is a prefix-with-slash at all.)
  const current = SECTIONS.reduce<string | null>((best, s) => {
    const matches = pathname === s.href || pathname.startsWith(`${s.href}/`);
    return matches && (!best || s.href.length > best.length) ? s.href : best;
  }, null);

  return (
    <>
      {SECTIONS.map((s) => {
        const active = s.href === current;
        return (
          <Link
            key={s.href}
            href={s.href}
            className="nav-link"
            aria-current={active ? "page" : undefined}
          >
            {variant === "icon" && (
              <span className="nav-link__icon">
                <NavIcon name={s.icon} />
              </span>
            )}
            {variant === "icon" ? (
              <span className="nav-link__text">
                <span className="nav-link__full">{s.label}</span>
                <span className="nav-link__short">{s.short}</span>
              </span>
            ) : (
              <span className="nav-link__text">{variant === "short" ? s.short : s.label}</span>
            )}
            <LinkPending />
          </Link>
        );
      })}
    </>
  );
}
