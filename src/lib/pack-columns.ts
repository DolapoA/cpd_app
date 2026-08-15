import type { StandardsFramework } from "./standards";

/**
 * Which columns a compliance pack shows, and which of them the user may not
 * remove.
 *
 * A pack is evidence submitted to a regulator, so the choice is not purely
 * cosmetic: a column can be locked because the body asks for it, or because
 * the document is incoherent without it. Those are different reasons and the
 * interface says which is which, rather than presenting every lock as a rule
 * from on high.
 *
 * The lock is enforced when the selection is resolved, not by disabling a
 * checkbox — a disabled input is a hint, and a hand-edited URL would walk
 * straight past it.
 */

export type PackColumnId =
  | "date"
  | "activity"
  | "type"
  | "standards"
  | "reflection"
  | "cpd"
  | "provider"
  | "evidence";

export type PackKind = "hcpc" | "gmc";

export type PackColumn = {
  id: PackColumnId;
  label: string;
  /** What it contains, for the picker. */
  hint: string;
};

export const PACK_COLUMNS: PackColumn[] = [
  { id: "date", label: "Date", hint: "When the activity took place." },
  { id: "activity", label: "Activity", hint: "The title of what you did." },
  { id: "provider", label: "Provider", hint: "Who ran or delivered it." },
  { id: "type", label: "Activity type", hint: "Work-based, professional, formal, self-directed or other." },
  { id: "standards", label: "Framework code", hint: "The code each activity is tagged against." },
  { id: "reflection", label: "Reflection and outcomes", hint: "What you learned and how it changed your practice." },
  { id: "cpd", label: "Points and hours", hint: "Credits or hours, and whether the CPD was accredited." },
  { id: "evidence", label: "Evidence", hint: "Whether attendance was captured on a register, with its verification code." },
];

type Lock = { id: PackColumnId; because: string };

/**
 * Locked columns, each with the reason. Two kinds of reason appear here:
 * something the regulator asks for, and something without which the document
 * would not be a dated record of activity at all.
 */
function locksFor(kind: PackKind, framework: StandardsFramework | null, body: string): Lock[] {
  const structural: Lock[] = [
    { id: "date", because: "An audit covers a period, so an undated activity evidences nothing." },
    { id: "activity", because: "Without it there is no record of what you did." },
  ];

  const byKind: Record<PackKind, Lock[]> = {
    hcpc: [
      {
        id: "type",
        because:
          "HCPC expects a mixture of learning types, and the type column is what demonstrates the mix.",
      },
      {
        id: "reflection",
        because:
          "HCPC standards 3 and 4 ask you to show CPD contributed to your practice and benefited service users. Reflection is where that is evidenced.",
      },
    ],
    gmc: [
      {
        id: "cpd",
        because: "Appraisal and revalidation are discussed in CPD credits and hours.",
      },
      {
        id: "reflection",
        because:
          "The GMC's guidance on reflective practice makes reflection the substance of the appraisal discussion, not an optional extra.",
      },
    ],
  };

  // A body that mandates tagging each activity expects to see the tags.
  const frameworkLock: Lock[] = framework
    ? [
        {
          id: "standards",
          because: `${body} requires each activity to carry a ${framework.noun}.`,
        },
      ]
    : [];

  return [...structural, ...byKind[kind], ...frameworkLock];
}

export type PackSelection = {
  /** Columns to render, in the order they appear in PACK_COLUMNS. */
  visible: Set<PackColumnId>;
  /** Locked columns and why, for the picker. */
  locks: Map<PackColumnId, string>;
  /** Columns offered at all — "standards" only exists where a framework does. */
  available: PackColumn[];
};

const DEFAULT_HIDDEN: PackColumnId[] = ["provider"];

/**
 * Resolves what the pack shows.
 *
 * @param body   The regulator's name, for wording the lock reason.
 * @param chosen Ids from the query string, or null when the user has not
 *               chosen — in which case everything applicable is shown, because
 *               a first view should be complete rather than minimal.
 */
export function resolvePackColumns(
  kind: PackKind,
  framework: StandardsFramework | null,
  body: string,
  chosen: string[] | null
): PackSelection {
  const available = PACK_COLUMNS.filter((c) => c.id !== "standards" || framework !== null);
  const locks = new Map(locksFor(kind, framework, body).map((l) => [l.id, l.because]));

  const visible = new Set<PackColumnId>(
    chosen === null
      ? available.map((c) => c.id).filter((id) => !DEFAULT_HIDDEN.includes(id))
      : available.map((c) => c.id).filter((id) => chosen.includes(id))
  );

  // The lock, applied where it actually holds: a column the regulator needs
  // goes back in whatever the request asked for.
  for (const id of locks.keys()) {
    if (available.some((c) => c.id === id)) visible.add(id);
  }

  return { visible, locks, available };
}
