"use client";

import { useEffect } from "react";
import { GUEST_PLAN_KEY } from "@/lib/guest-plan";

/** The draft has become real goals; the browser's copy has done its job. */
export function ClearGuestPlan() {
  useEffect(() => {
    try {
      localStorage.removeItem(GUEST_PLAN_KEY);
    } catch {
      /* nothing to clear */
    }
  }, []);
  return null;
}
