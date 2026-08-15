export const ACTIVITY_TYPES = [
  "Work-based learning",
  "Professional activity",
  "Formal / educational",
  "Self-directed learning",
  "Other",
] as const;

/**
 * Illustrative examples of what falls under each type, so someone who is short
 * of a category can see what would fill it. Modelled on the kinds of activity
 * the HCPC lists as counting — indicative, not an exhaustive or official list.
 */
export const ACTIVITY_TYPE_EXAMPLES: Record<string, string> = {
  "Work-based learning":
    "Reflecting on a case, clinical audit, in-service training, supervising a student, peer review, project work.",
  "Professional activity":
    "Teaching or lecturing, presenting, journal club, mentoring, examining, committee or society work.",
  "Formal / educational":
    "Courses, conferences, study days, accredited e-learning, formal qualifications, research.",
  "Self-directed learning":
    "Reading journals or guidelines, podcasts, reviewing literature, keeping up to date online.",
  Other: "Anything that doesn’t fit the categories above — voluntary work, public service.",
};

export const EVENT_TYPES = [
  "Conference",
  "Study day",
  "Workshop",
  "Journal club",
  "In-house teaching",
  "Webinar",
  "Other",
] as const;

export const REGULATORS = [
  "GMC",
  "HCPC",
  "NMC",
  "GPhC",
  "GDC",
  "GOC",
  "RCVS",
  "FCA",
  "SRA",
  "BSB",
  "ICAEW",
  "ACCA",
  "CIMA",
  "RICS",
  "ARB",
  "RIBA",
  // The Engineering Council holds the register, but the CPD obligation is
  // administered by the licensed institution a member belongs to — it is the
  // institution that runs the annual sample. Both are offered, because an
  // engineer asked "who are you registered with?" may reasonably say either.
  "Engineering Council",
  "IMechE",
  "ICE",
  "IET",
  "IChemE",
  "RAeS",
  // Teaching is regulated separately in each nation, and only Scotland ties
  // CPD to registration. England has no statutory CPD requirement and no
  // registering body for it, so English teachers belong under "Other".
  "GTCS",
  "EWC (Wales)",
  "GTCNI",
  "Other",
  "None",
] as const;

/** Regulators with a dedicated compliance pack — gates which packs are offered on the dashboard and record page. */
export const HCPC_AUDIT_PACK_REGULATOR = "HCPC";
export const GMC_APPRAISAL_REGULATOR = "GMC";
export const GTCS_UPDATE_REGULATOR = "GTCS";

/**
 * Bodies whose CPD duty runs through the Engineering Council's licensing:
 * every licensed institution must sample at least 5% of its registered members
 * each year, and members must keep a record in case they are picked.
 */
export const ENGINEERING_BODIES = [
  "Engineering Council",
  "IMechE",
  "ICE",
  "IET",
  "IChemE",
  "RAeS",
] as const;

export function isEngineeringBody(regulator: string | null): boolean {
  return !!regulator && (ENGINEERING_BODIES as readonly string[]).includes(regulator);
}

export function formatDate(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}
