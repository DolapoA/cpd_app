/**
 * The professions someone can choose, and the matching that makes them usable.
 *
 * Free text was fine while a profession was only ever displayed back to its
 * owner. It stops being fine the moment two people have to be recognised as
 * doing the same job — "Physiotherapist", "physio" and "Physiotherapy" are one
 * profession to a human and three to a database.
 *
 * A list is possible here because most of these titles are protected: you may
 * not call yourself a physiotherapist or a registered nurse in the UK unless
 * you are on the register, so the wording is fixed by law rather than by
 * preference. Anything not listed is kept as typed and matched on a normalised
 * form of the text, which is weaker but still catches the common cases.
 */

export type ProfessionGroup = { label: string; professions: string[] };

export const PROFESSION_GROUPS: ProfessionGroup[] = [
  {
    label: "Health and care",
    professions: [
      "Physiotherapist",
      "Occupational therapist",
      "Speech and language therapist",
      "Dietitian",
      "Podiatrist",
      "Paramedic",
      "Radiographer",
      "Operating department practitioner",
      "Biomedical scientist",
      "Clinical scientist",
      "Orthoptist",
      "Prosthetist / orthotist",
      "Art, music or drama therapist",
      "Practitioner psychologist",
      "Hearing aid dispenser",
      "Social worker",
      "Nurse",
      "Midwife",
      "Nursing associate",
      "Doctor",
      "Dentist",
      "Dental hygienist or therapist",
      "Dental nurse",
      "Pharmacist",
      "Pharmacy technician",
      "Optometrist",
      "Dispensing optician",
      "Osteopath",
      "Chiropractor",
      "Veterinary surgeon",
      "Veterinary nurse",
    ],
  },
  {
    label: "Education",
    professions: ["Teacher", "Headteacher or school leader", "Lecturer", "Teaching assistant"],
  },
  {
    label: "Engineering and built environment",
    professions: [
      "Mechanical engineer",
      "Civil engineer",
      "Electrical engineer",
      "Electronic engineer",
      "Chemical engineer",
      "Aerospace engineer",
      "Structural engineer",
      "Architect",
      "Surveyor",
      "Town planner",
    ],
  },
  {
    label: "Law, finance and business",
    professions: [
      "Solicitor",
      "Barrister",
      "Legal executive",
      "Paralegal",
      "Accountant",
      "Auditor",
      "Actuary",
      "Financial adviser",
      "Mortgage adviser",
      "Insurance broker",
    ],
  },
];

export const PROFESSIONS: string[] = PROFESSION_GROUPS.flatMap((g) => g.professions);

/** Chosen when nothing on the list fits; the typed title is kept alongside. */
export const OTHER_PROFESSION = "Other";

/**
 * The key two people must share to count as the same profession.
 *
 * Lower-cased, punctuation dropped, and a trailing "s" removed so that
 * "Physiotherapists" meets "physiotherapist". Deliberately conservative: it
 * will fail to join "physio" to "physiotherapist", which leaves two small
 * groups rather than wrongly merging two professions.
 */
/**
 * The word each profession uses for its own kind of judgement.
 *
 * Multi-source feedback asks two questions that only read properly in a
 * profession's own language: "makes {word}-appropriate decisions" and "is
 * appropriately {word} skilled for their practice". A scientist makes
 * scientifically-appropriate decisions; a physiotherapist makes clinically-
 * appropriate ones; a solicitor makes neither.
 *
 * Kept beside the list rather than inside it, the way STANDARDS_FRAMEWORKS
 * sits beside REGULATORS — a profession is a bare string everywhere else and
 * widening that type would touch the picker, the matcher and every consumer
 * for the sake of two sentences.
 *
 * Every value has to work as an adverb in both slots above. That is the whole
 * constraint, and it is why this is a string rather than an object: a future
 * question needing an adjective would need a different shape, and inventing
 * one now for a question nobody has written would be guessing.
 *
 * Unlisted professions, free-typed ones and people who have not said fall
 * back to "professionally", which is true of everybody and wrong for nobody.
 */
const PROFESSION_WORDS: Record<string, string> = {
  // Health and care — "clinically" for anyone who sees patients, and
  // "scientifically" for the laboratory professions whose judgements are
  // about analysis rather than treatment.
  physiotherapist: "clinically",
  "occupational therapist": "clinically",
  "speech and language therapist": "clinically",
  dietitian: "clinically",
  podiatrist: "clinically",
  paramedic: "clinically",
  radiographer: "clinically",
  "operating department practitioner": "clinically",
  "biomedical scientist": "scientifically",
  "clinical scientist": "scientifically",
  orthoptist: "clinically",
  "prosthetist orthotist": "clinically",
  "art music or drama therapist": "clinically",
  "hearing aid dispenser": "clinically",
  "practitioner psychologist": "clinically",
  "social worker": "professionally",
  nurse: "clinically",
  midwife: "clinically",
  "nursing associate": "clinically",
  doctor: "clinically",
  dentist: "clinically",
  "dental hygienist or therapist": "clinically",
  "dental nurse": "clinically",
  pharmacist: "clinically",
  "pharmacy technician": "clinically",
  optometrist: "clinically",
  "dispensing optician": "clinically",
  osteopath: "clinically",
  chiropractor: "clinically",
  "veterinary surgeon": "clinically",
  "veterinary nurse": "clinically",

  // Education
  teacher: "educationally",
  "headteacher or school leader": "educationally",
  lecturer: "academically",
  "teaching assistant": "educationally",

  // Engineering and built environment
  "mechanical engineer": "technically",
  "civil engineer": "technically",
  "electrical engineer": "technically",
  "electronic engineer": "technically",
  "chemical engineer": "technically",
  "aerospace engineer": "technically",
  "structural engineer": "technically",
  architect: "technically",
  surveyor: "technically",
  "town planner": "technically",

  // Law, finance and business
  solicitor: "legally",
  barrister: "legally",
  "legal executive": "legally",
  paralegal: "legally",
  accountant: "financially",
  auditor: "financially",
  actuary: "financially",
  "financial adviser": "financially",
  "mortgage adviser": "financially",
  "insurance broker": "financially",
};

/** The adverb for a profession, or the neutral one. Never returns null. */
export function professionWord(profession: string | null | undefined): string {
  const key = professionKey(profession);
  return (key && PROFESSION_WORDS[key]) || "professionally";
}

export function professionKey(profession: string | null | undefined): string | null {
  if (!profession) return null;
  const cleaned = profession
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return cleaned.endsWith("s") && !cleaned.endsWith("ss") ? cleaned.slice(0, -1) : cleaned;
}

/** Matches free text already in the database to a listed title, where it can. */
export function canonicalProfession(text: string | null | undefined): string | null {
  const key = professionKey(text);
  if (!key) return null;
  const hit = PROFESSIONS.find((p) => professionKey(p) === key);
  return hit ?? (text ?? null);
}

export function isListedProfession(text: string | null | undefined): boolean {
  return !!text && PROFESSIONS.includes(text);
}

/** How a profession reads in the plural, for "what other physiotherapists are attending". */
export function pluralProfession(profession: string): string {
  const lower = profession.toLowerCase();
  if (lower.endsWith("s")) return lower;
  if (lower.endsWith("y") && !/[aeiou]y$/.test(lower)) return `${lower.slice(0, -1)}ies`;
  return `${lower}s`;
}
