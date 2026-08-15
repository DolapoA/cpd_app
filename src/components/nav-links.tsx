"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECTIONS } from "@/lib/sections";
import { NavIcon } from "./nav-icons";

/**
 * Section links that know which one you are on. Client-side only because the
 * current path is the one thing a server component cannot see.
 *
 * Both labels are rendered and CSS chooses between them, since the rail and
 * the phone tab bar are the same markup at different widths.
 */
export function NavLinks({ variant = "full" }: { variant?: "full" | "short" | "icon" }) {
  const pathname = usePathname();

  return (
    <>
      {SECTIONS.map((s) => {
        // /record must not stay lit while you are on /registers.
        const active = pathname === s.href || pathname.startsWith(`${s.href}/`);
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
          </Link>
        );
      })}
    </>
  );
}
