"use client";

import { useEffect, useState } from "react";

/**
 * Hides and reveals the navigation rail on a desktop.
 *
 * The state lives as a class on <html> rather than in React, for the same
 * reason the Yoruba app's drawer does: the rail, the page beside it and the
 * reveal button all have to move together, and one class lets CSS animate
 * them as one thing instead of three components agreeing about a boolean.
 *
 * It is remembered, because someone who puts the rail away on a laptop meant
 * it — this is a working surface, not a dialog. The class is applied before
 * paint by a script in the document head, so a hidden rail never flashes into
 * view on load.
 */

export const RAIL_HIDDEN_CLASS = "rail-hidden";
const STORAGE_KEY = "cpd:rail-hidden";

/**
 * Runs before React, in the head. Inlined as a string because by the time a
 * component could do this, the rail has already been painted.
 */
export const railInitScript = `try{if(localStorage.getItem('${STORAGE_KEY}')==='1')document.documentElement.classList.add('${RAIL_HIDDEN_CLASS}')}catch(e){}`;

function useRailHidden(): [boolean, (hidden: boolean) => void] {
  const [hidden, setHidden] = useState(false);

  // The class is already correct at this point; this only teaches React what
  // the document is doing, so the buttons render with the right labels.
  useEffect(() => {
    setHidden(document.documentElement.classList.contains(RAIL_HIDDEN_CLASS));
  }, []);

  const apply = (next: boolean) => {
    document.documentElement.classList.toggle(RAIL_HIDDEN_CLASS, next);
    setHidden(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Private browsing refuses storage; the rail simply comes back next time.
    }
  };

  return [hidden, apply];
}

function MenuIcon({ open }: { open: boolean }) {
  // Two glyphs on one 20×20 grid: the collapse arrow while the rail is open,
  // the three bars once it is away and the button has to say "menu".
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {open ? (
        <>
          <path d="M11.5 5.5 7 10l4.5 4.5" />
          <path d="M15.5 4v12" />
        </>
      ) : (
        <>
          <path d="M3 5.5h14" />
          <path d="M3 10h14" />
          <path d="M3 14.5h14" />
        </>
      )}
    </svg>
  );
}

/** The button that lives in the rail and puts it away. */
export function RailCollapse() {
  const [hidden, setHidden] = useRailHidden();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        document.documentElement.classList.add(RAIL_HIDDEN_CLASS);
        try {
          localStorage.setItem(STORAGE_KEY, "1");
        } catch {
          // As above.
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <button
      type="button"
      className="rail-toggle"
      onClick={() => setHidden(true)}
      aria-controls="site-rail"
      aria-expanded={!hidden}
      aria-label="Hide the menu"
      title="Hide the menu"
    >
      <MenuIcon open />
    </button>
  );
}

/**
 * The button that brings it back. Rendered always and shown by CSS only when
 * the rail is away, so revealing it does not depend on React having hydrated.
 */
export function RailReveal() {
  const [hidden, setHidden] = useRailHidden();

  return (
    <button
      type="button"
      className="rail-reveal"
      onClick={() => setHidden(false)}
      aria-controls="site-rail"
      aria-expanded={hidden ? false : true}
      aria-label="Show the menu"
      title="Show the menu"
    >
      <MenuIcon open={false} />
    </button>
  );
}
