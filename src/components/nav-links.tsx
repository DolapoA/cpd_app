"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECTIONS } from "@/lib/sections";

/**
 * Section links that know which one you are on. Client-side only because the
 * current path is the one thing a server component cannot see.
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
              <span className="nav-link__icon" aria-hidden="true">
                {s.icon}
              </span>
            )}
            <span className="nav-link__text">
              {variant === "short" || variant === "icon" ? s.short : s.label}
            </span>
          </Link>
        );
      })}
    </>
  );
}
