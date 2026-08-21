import type { CpdEntry } from "./db";
import { parseStandards, type StandardsFramework } from "./standards";

/* "Other" as a type used to be a gap here. It is not: some learning genuinely
   fits no listed type, and telling somebody their honest description of it is
   incomplete pressures them to mislabel it — the opposite of what a record is
   for. The dashboard still shows the mix; whether the mix satisfies a
   regulator is the person's judgement to make, not this file's. */
export type GapKey = "reflection" | "time" | "standards";

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
