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
 */
export type ProductEvent =
  /** An account was created. `source` shows whether the guest→account loop worked. */
  | { name: "signup"; source: "guest_slip" | "direct" }
  /** An organiser set up an event. */
  | { name: "register_created"; official: boolean; collecting_feedback: boolean }
  /** Somebody signed a register — the core capture moment. */
  | { name: "register_signed"; as: "guest" | "account" }
  /** A guest took their PDF away. */
  | { name: "slip_downloaded" }
  /** Someone checked a slip — evidence of the evidence being trusted. */
  | { name: "verification_viewed"; outcome: "verified" | "voided" | "not_found" }
  /** Migration from a spreadsheet succeeded. */
  | { name: "record_imported"; size: "1-10" | "11-50" | "51-200" | "200+" }
  /** The payoff: a record turned into something a regulator asked for. */
  | { name: "compliance_pack_generated"; kind: "hcpc" | "gmc" | "gtcs" }
  /** A user told us something was wrong. */
  | { name: "report_submitted"; kind: string };

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
