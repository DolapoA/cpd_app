"use client";

import { useEffect, useState } from "react";
import { GUEST_GOALS_FIELD, GUEST_PLAN_KEY } from "@/lib/guest-plan";

const CLAIMED_COOKIE = "cpd_plan_claimed";

/**
 * Carries a plan written as a guest into the sign-up or log-in form.
 *
 * Rendered empty on the server and filled from this browser's draft on the
 * client; a form submitted without JavaScript simply carries no plan, which
 * is the same as having written none.
 *
 * If the server says the draft has already been claimed — a cookie it sets
 * on the way through — the browser's copy is spent, and is cleared here
 * rather than offered a second time.
 */
export function GuestGoalsField() {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try {
      if (document.cookie.split("; ").some((c) => c.startsWith(`${CLAIMED_COOKIE}=`))) {
        localStorage.removeItem(GUEST_PLAN_KEY);
        document.cookie = `${CLAIMED_COOKIE}=; Max-Age=0; path=/`;
        return;
      }
      setDraft(localStorage.getItem(GUEST_PLAN_KEY) ?? "");
    } catch {
      /* nothing to carry */
    }
  }, []);

  if (!draft) return null;
  return <input type="hidden" name={GUEST_GOALS_FIELD} value={draft} />;
}
