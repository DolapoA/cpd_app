import "server-only";
import { track } from "@vercel/analytics/server";

/**
 * Product events.
 *
 * Two rules, both non-negotiable for this app:
 *
 *  1. No personal data ever leaves in a property — no name, email, register
 *     code or verification code. A verification code in particular is a
 *     credential: it fetches a PDF carrying somebody's name and email.
 *  2. Counts are bucketed rather than exact, so a single unusual number cannot
 *     identify the person it belongs to.
 *
 * These measure whether the product is doing its job, not how busy it is.
 * Page views are already collected; these are the moments that mean something.
 *
 * Three more are sent from the browser rather than here, because they describe
 * things only the browser knows: `install_prompt_shown`,
 * `install_prompt_dismissed` and `app_installed`, all carrying a `platform`.
 * They live in components/install-prompt.tsx and follow the same two rules.
 */
export type ProductEvent =
  /** An account was created. `source` shows whether the guest→account loop worked. */
  | { name: "signup"; source: "guest_slip" | "direct" }
  /** An organiser set up an event. */
  | { name: "register_created"; official: boolean; collecting_feedback: boolean }
  /**
   * Somebody signed a register — the core capture moment, and the number to
   * judge the register flow by rather than bounce rate: a guest who scans a
   * QR, signs, and leaves has used the product exactly as intended, whatever
   * a single-page-view metric makes of it. `demo` separates the home page's
   * try-it register from the real thing, so the real count stays clean.
   */
  | { name: "register_signed"; as: "guest" | "account"; demo: boolean }
  /** A guest took their PDF away. */
  | { name: "slip_downloaded" }
  /** Someone checked a slip — evidence of the evidence being trusted. */
  | { name: "verification_viewed"; outcome: "verified" | "voided" | "not_found" }
  /** Migration from a spreadsheet succeeded. */
  | { name: "record_imported"; size: "1-10" | "11-50" | "51-200" | "200+" }
  /** The payoff: a record turned into something a regulator asked for. */
  | { name: "compliance_pack_generated"; kind: "hcpc" | "gmc" | "gtcs" | "engineering" }
  /** A user told us something was wrong. */
  | { name: "report_submitted"; kind: string }
  | { name: "planned_event_added" }
  /* Bucketed, not exact: how many colleagues somebody asked is a detail about
     their working life, and the useful question is only whether rounds are
     being opened at all. */
  | { name: "msf_requested"; colleagues: number }
  | { name: "msf_response_submitted" }
  /* One when a development goal is added, one when it is reviewed — enough to
     see whether plans are being kept, without knowing what anyone's goals are. */
  | { name: "pdp_goal_added" }
  | { name: "pdp_goal_reviewed" }
  /* A plan written without an account, kept by making one (or logging in).
     Bucketed like the rest: whether the door works, not what came through. */
  | { name: "guest_plan_claimed"; goals: "1-10" | "11-50" | "51-200" | "200+" };

export function bucketSize(n: number): "1-10" | "11-50" | "51-200" | "200+" {
  if (n <= 10) return "1-10";
  if (n <= 50) return "11-50";
  if (n <= 200) return "51-200";
  return "200+";
}

/** Never let analytics break a user action. */
export async function record(event: ProductEvent): Promise<void> {
  const { name, ...properties } = event;
  try {
    await track(name, properties as Record<string, string | number | boolean>);
  } catch (error) {
    console.error("[analytics] dropped", name, error);
  }
}
