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
