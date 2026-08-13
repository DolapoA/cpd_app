import type { CpdEntry } from "./db";
import { parseStandards, type StandardsFramework } from "./standards";

export type GapKey = "reflection" | "time" | "type" | "standards";

export type Gap = {
  key: GapKey;
  /** Short label for the badge on the record row. */
  label: string;
  /** Why it matters, shown when the user goes to fill it in. */
  why: string;
};

/**
 * What an entry is missing that a regulator would expect to see.
 *
 * Kept deliberately narrow: these are the things every UK CPD scheme asks for
 * in some form, not a wishlist. Nothing here blocks saving — an incomplete
 * record is still a record, and an import should never be rejected for being
 * thin. The user is told, and can fix it when they choose.
 */
export function gapsFor(
  entry: Pick<CpdEntry, "notes" | "hours" | "points" | "activity_type" | "standards">,
  framework: StandardsFramework | null
): Gap[] {
  const gaps: Gap[] = [];

  if (!entry.notes || entry.notes.trim() === "") {
    gaps.push({
      key: "reflection",
      label: "Reflection",
      why: "What you learned, and what you'll do differently. The thing auditors most often find missing.",
    });
  }

  if (entry.hours == null && entry.points == null) {
    gaps.push({
      key: "time",
      label: "Hours",
      why: "Without hours or credits, this doesn't count towards your totals.",
    });
  }

  if (entry.activity_type === "Other") {
    gaps.push({
      key: "type",
      label: "Activity type",
      why: "“Other” doesn’t show the mix of learning types regulators look for.",
    });
  }

  if (framework && parseStandards(entry.standards).length === 0) {
    gaps.push({
      key: "standards",
      label: framework.columnHeader,
      why: framework.mandate,
    });
  }

  return gaps;
}

export function hasGaps(
  entry: Parameters<typeof gapsFor>[0],
  framework: StandardsFramework | null
): boolean {
  return gapsFor(entry, framework).length > 0;
}
