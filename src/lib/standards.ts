/**
 * Per-entry classification frameworks, by regulator or professional body.
 *
 * An honesty constraint runs through this file. These bodies differ sharply in
 * what they actually demand, and the product must not tell a user their
 * regulator requires something it doesn't:
 *
 * Every framework listed here is one the body genuinely mandates per activity,
 * so an entry cannot be saved without a code. Bodies that do not mandate one are
 * deliberately absent and their registrants are never asked:
 *
 *  - The HCPC's five standards are obligations on the registrant, not attributes
 *    of an activity — you cannot coherently tag a single activity to "maintain a
 *    continuous record". Its real per-activity rule is the mix of activity types,
 *    which this app enforces separately through ACTIVITY_TYPES and the dashboard
 *    warning, so nothing is lost by leaving it out.
 *  - The GMC, SRA and Engineering Council have no per-activity taxonomy at all.
 *    The SRA explicitly rejected mandating learning per competence area;
 *    inventing a field for them would be worse than leaving it out.
 *
 * `mandate` is shown to the user verbatim, so each body's own wording carries.
 */

export type StandardItem = {
  code: string;
  title: string;
};

export type StandardsFramework = {
  /** Column heading in the record table and exports. */
  columnHeader: string;
  /** Sentence-case form for use mid-sentence; keeps acronyms capitalised. */
  noun: string;
  /** Field label when adding or editing an entry. */
  fieldLabel: string;
  /** Whether one activity may legitimately carry several codes at once. */
  multiple: boolean;
  /** How the body actually frames it — displayed to the user as written. */
  mandate: string;
  sourceUrl: string;
  items: StandardItem[];
};

export const STANDARDS_FRAMEWORKS: Record<string, StandardsFramework> = {
  // The strongest case of the lot: the GDC requires the link explicitly.
  GDC: {
    columnHeader: "Development outcome",
    noun: "development outcome",
    fieldLabel: "Development outcome",
    multiple: true,
    mandate:
      "The GDC requires at least one outcome per activity. You can pick several.",
    sourceUrl:
      "https://www.gdc-uk.org/education-cpd/cpd/enhanced-cpd-scheme-2018/development-outcomes",
    items: [
      {
        code: "A",
        title:
          "Effective communication with patients, the dental team and others across dentistry, including when obtaining consent, dealing with complaints, and raising concerns when patients are at risk",
      },
      {
        code: "B",
        title:
          "Effective management of self and effective management of others or effective work with others in the dental team, in the interests of patients; providing constructive leadership where appropriate",
      },
      {
        code: "C",
        title: "Maintenance and development of knowledge and skill within your field of practice",
      },
      {
        code: "D",
        title:
          "Maintenance of skills, behaviours and attitudes which maintain patient confidence in you and the dental profession and put patients’ interests first",
      },
    ],
  },

  // The NMC's own CPD log asks for "the part or parts of the Code" relevant to
  // each activity, so multi-select matches the template.
  NMC: {
    columnHeader: "Code theme",
    noun: "Code theme",
    fieldLabel: "Parts of the Code",
    multiple: true,
    mandate:
      "The NMC's CPD log asks which parts of the Code each activity relates to. You can pick several.",
    sourceUrl: "https://www.nmc.org.uk/standards/code/",
    items: [
      { code: "1", title: "Prioritise people" },
      { code: "2", title: "Practise effectively" },
      { code: "3", title: "Preserve safety" },
      { code: "4", title: "Promote professionalism and trust" },
    ],
  },

  // Mutually exclusive by definition, and the ratio is what gets assessed.
  GPhC: {
    columnHeader: "Learning type",
    noun: "learning type",
    fieldLabel: "Learning type",
    multiple: false,
    mandate:
      "The GPhC expects four records a year, at least two of them planned learning.",
    sourceUrl: "https://www.pharmacyregulation.org/pharmacists/revalidation-renewal",
    items: [
      { code: "P", title: "Planned learning — you identified the need and set out to meet it" },
      { code: "U", title: "Unplanned learning — it arose from practice or an unexpected event" },
    ],
  },

  RICS: {
    columnHeader: "CPD type",
    noun: "CPD type",
    fieldLabel: "CPD type",
    multiple: false,
    mandate:
      "RICS requires 20 hours a year, at least 10 of them structured.",
    sourceUrl: "https://www.rics.org/surveying-profession/career-development/cpd",
    items: [
      {
        code: "S",
        title: "Structured — formal learning with clear objectives and outcomes",
      },
      {
        code: "U",
        title: "Unstructured — informal reading, research or self-directed learning",
      },
    ],
  },

  FCA: {
    columnHeader: "CPD type",
    noun: "CPD type",
    fieldLabel: "CPD type",
    multiple: false,
    mandate:
      "Advisers need 35 hours a year. FCA guidance says at least 21 should be structured.",
    sourceUrl: "https://www.fca.org.uk/firms/professional-standards-advisers",
    items: [
      {
        code: "S",
        title: "Structured — courses, seminars, lectures, conferences, workshops, web-based seminars",
      },
      { code: "U", title: "Unstructured — reading, research and other self-directed learning" },
    ],
  },

  // ARB is unusual: the scheme explicitly forbids tagging one activity to more
  // than one topic, so this is the one framework that must stay single-select.
  ARB: {
    columnHeader: "Topic",
    noun: "topic",
    fieldLabel: "Topic",
    multiple: false,
    mandate:
      "ARB requires one topic per activity — pick the most relevant. You can't choose several.",
    sourceUrl: "https://arb.org.uk/architect-information/cpd/",
    items: [
      { code: "F", title: "Fire and life safety (mandatory topic)" },
      { code: "E", title: "Environmental sustainability (mandatory topic)" },
      { code: "O", title: "Other — general professional development" },
    ],
  },

  // RIBA is a membership body, not a statutory regulator; the copy says so.
  RIBA: {
    columnHeader: "Core curriculum topic",
    noun: "core curriculum topic",
    fieldLabel: "Core curriculum topics",
    multiple: true,
    mandate:
      "RIBA is a membership body, not a regulator. Chartered members need 35 hours a year, including 2 in each topic.",
    sourceUrl: "https://www.riba.org/learn/professional-learning/riba-cpd/riba-cpd-core-curriculum/",
    items: [
      { code: "1", title: "Architecture for social purpose" },
      { code: "2", title: "Health, safety and wellbeing" },
      { code: "3", title: "Business, clients and services" },
      { code: "4", title: "Legal, regulatory and statutory compliance" },
      { code: "5", title: "Procurement and contracts" },
      { code: "6", title: "Sustainable architecture" },
      { code: "7", title: "Inclusive environments" },
      { code: "8", title: "Places, planning and communities" },
      { code: "9", title: "Building conservation and heritage" },
      { code: "10", title: "Design, construction and technology" },
    ],
  },
};

export function frameworkFor(regulator: string | null | undefined): StandardsFramework | null {
  if (!regulator) return null;
  return STANDARDS_FRAMEWORKS[regulator] ?? null;
}

/** Stored as a comma-separated list of codes, e.g. "2,3". */
export function parseStandards(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serialiseStandards(codes: string[]): string | null {
  const unique = [...new Set(codes.map((c) => c.trim()).filter(Boolean))];
  return unique.length ? unique.join(",") : null;
}

/**
 * Keeps only codes the framework defines, in framework order. Single-select
 * frameworks are truncated to one code — ARB's scheme forbids multi-tagging, so
 * this is enforced server-side rather than trusted to the radio inputs.
 */
export function validStandards(framework: StandardsFramework, codes: string[]): string[] {
  const allowed = new Set(framework.items.map((i) => i.code));
  const chosen = new Set(codes.map((c) => c.trim()).filter((c) => allowed.has(c)));
  const ordered = framework.items.filter((i) => chosen.has(i.code)).map((i) => i.code);
  return framework.multiple ? ordered : ordered.slice(0, 1);
}
