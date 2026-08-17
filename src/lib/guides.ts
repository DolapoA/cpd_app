import { STANDARDS_FRAMEWORKS } from "./standards";

/**
 * The public guides — the only substantial part of this site a search engine
 * is allowed to see.
 *
 * Every factual claim here either comes from a framework already in the app,
 * which carries the body's own wording and a link to it, or describes what
 * this app does. Nothing is asserted about a regulator's requirements that is
 * not sourced, because a page that gets someone's revalidation wrong is worse
 * than no page at all — and would deserve the ranking it got.
 */
export type Guide = {
  slug: string;
  /** The regulator or body, as named in REGULATORS. */
  body: string;
  bodyName: string;
  /** Who this is for, in the words they would use about themselves. */
  audience: string;
  title: string;
  description: string;
  /** One paragraph: what the obligation actually is. */
  requirement: string;
  /** Optional framework key, for the "what to record against" section. */
  framework?: string;
  /** What this app produces for them, and where. */
  output: { label: string; href: string; blurb: string };
  faqs: { q: string; a: string }[];
};

export const GUIDES: Guide[] = [
  {
    slug: "hcpc",
    body: "HCPC",
    bodyName: "the Health and Care Professions Council",
    audience:
      "physiotherapists, paramedics, radiographers, occupational therapists, dietitians and the other professions on the HCPC register",
    title: "HCPC CPD records and audit: what to keep, and how",
    description:
      "What the HCPC asks registrants to keep, why a mix of learning types matters, and how to produce a dated CPD profile for your two-year renewal cycle.",
    requirement:
      "The HCPC does not set an hours target. It asks registrants to keep a continuous record of CPD, to include a mixture of learning types rather than relying on one, and — if selected at audit — to submit a profile showing how that learning has improved the quality of their practice and benefited service users. Registration renews on a two-year cycle, and a sample of each profession is audited at renewal.",
    output: {
      label: "HCPC audit pack",
      href: "/record/audit-pack",
      blurb:
        "A dated record over the period you choose, defaulting to your two-year cycle, with the mix of learning types shown on its face.",
    },
    faqs: [
      {
        q: "How many CPD hours does the HCPC require?",
        a: "The HCPC sets no hours or points target. It asks for a continuous record showing a mixture of learning types and, at audit, evidence of how that learning benefited service users. That is why this app records hours where you have them but never presents an hours total as a pass mark.",
      },
      {
        q: "What counts as CPD for the HCPC?",
        a: "Work-based learning, professional activity, formal education and self-directed learning all count. The point is the mixture: a record made entirely of one type is the common weakness at audit.",
      },
      {
        q: "What happens if I am audited?",
        a: "You are asked for a CPD profile covering the period since your last renewal. Keeping the record as you go — rather than reconstructing two years of it under a deadline — is the whole reason attendance here is captured at the event.",
      },
    ],
  },
  {
    slug: "gmc",
    body: "GMC",
    bodyName: "the General Medical Council",
    audience: "doctors on the GMC register",
    title: "CPD for GMC appraisal and revalidation",
    description:
      "How CPD fits into annual appraisal and five-yearly revalidation, and how to produce a dated summary of your CPD as supporting information.",
    requirement:
      "Doctors bring supporting information to an annual appraisal, and revalidate on a five-year cycle built from those appraisals. CPD is one of the types of supporting information discussed, alongside reflection on what the learning changed in your practice.",
    output: {
      label: "GMC appraisal summary",
      href: "/record/appraisal",
      blurb:
        "Your CPD for the appraisal year, in one dated document you can attach to your appraisal portfolio.",
    },
    faqs: [
      {
        q: "How many CPD credits do doctors need each year?",
        a: "Credit expectations come from the medical royal colleges and faculties rather than the GMC, and differ by specialty. This app lets you set your own annual target — 50 is a common one — and tracks against it rather than assuming a number.",
      },
      {
        q: "Does CPD alone satisfy revalidation?",
        a: "No. CPD is one part of the supporting information for appraisal. What this app produces is the CPD part, dated and exportable, not a revalidation portfolio.",
      },
    ],
  },
  {
    slug: "nmc",
    body: "NMC",
    bodyName: "the Nursing and Midwifery Council",
    audience: "nurses, midwives and nursing associates",
    title: "CPD for NMC revalidation",
    description:
      "What to record for NMC revalidation, how activities relate to the Code, and how to keep the CPD log as you go rather than at renewal.",
    requirement:
      "Nurses, midwives and nursing associates revalidate every three years. The CPD log asks which parts of the Code each activity relates to, so an entry is not complete until that link is made.",
    framework: "NMC",
    output: {
      label: "Your CPD record",
      href: "/record",
      blurb:
        "Every activity tagged to the parts of the Code it relates to, exportable whenever revalidation comes round.",
    },
    faqs: [
      {
        q: "What does the NMC CPD log need?",
        a: "Alongside the activity itself, the log asks which parts of the Code it relates to. This app asks for that on every entry and shows you which entries are still missing it.",
      },
      {
        q: "Can I record attendance at a study day automatically?",
        a: "If the organiser runs their register here, signing it puts the activity on your record as platform-verified — you were there, and it is dated and attributed rather than typed in from memory.",
      },
    ],
  },
  {
    slug: "gphc",
    body: "GPhC",
    bodyName: "the General Pharmaceutical Council",
    audience: "pharmacists and pharmacy technicians",
    title: "GPhC revalidation: planned and unplanned learning",
    description:
      "What the GPhC asks for each year, the difference between planned and unplanned learning, and how to keep records that are ready to submit.",
    requirement: STANDARDS_FRAMEWORKS.GPhC.mandate,
    framework: "GPhC",
    output: {
      label: "Your CPD record",
      href: "/record",
      blurb:
        "Each entry marked planned or unplanned, so the balance the GPhC assesses is visible all year rather than counted at the end.",
    },
    faqs: [
      {
        q: "What is the difference between planned and unplanned learning?",
        a: "Planned learning is learning you identified a need for and set out to do. Unplanned learning arose from practice or an unexpected event. The GPhC assesses the balance, which is why this app makes it a required choice rather than an optional note.",
      },
    ],
  },
  {
    slug: "gdc",
    body: "GDC",
    bodyName: "the General Dental Council",
    audience: "dentists, dental nurses, hygienists and therapists",
    title: "Enhanced CPD for the GDC: development outcomes",
    description:
      "How the GDC's Enhanced CPD scheme works, what a development outcome is, and how to keep a record where every activity carries one.",
    requirement: STANDARDS_FRAMEWORKS.GDC.mandate,
    framework: "GDC",
    output: {
      label: "Your CPD record",
      href: "/record",
      blurb:
        "Development outcomes recorded against each activity, and a list of the entries still missing one.",
    },
    faqs: [
      {
        q: "Does every activity need a development outcome?",
        a: "Yes — the GDC requires at least one per activity, and an activity may map to several. This app treats a missing outcome as an incomplete entry rather than a formatting preference.",
      },
    ],
  },
  {
    slug: "rics",
    body: "RICS",
    bodyName: "the Royal Institution of Chartered Surveyors",
    audience: "chartered surveyors",
    title: "RICS CPD: 20 hours, and what counts as structured",
    description:
      "The RICS annual CPD requirement, the split between structured and unstructured learning, and how to keep a record that shows it.",
    requirement: STANDARDS_FRAMEWORKS.RICS.mandate,
    framework: "RICS",
    output: {
      label: "Your CPD record",
      href: "/record",
      blurb:
        "Hours totalled by type, so the structured half is visible rather than worked out at the deadline.",
    },
    faqs: [
      {
        q: "What counts as structured CPD for RICS?",
        a: "Formal learning with clear objectives and outcomes. Informal reading and self-directed research count too, as unstructured — the requirement is that at least half of the twenty hours are structured.",
      },
    ],
  },
  {
    slug: "financial-advisers",
    body: "FCA",
    bodyName: "the Financial Conduct Authority",
    audience: "retail investment advisers and other regulated advisers",
    title: "CPD for financial advisers: 35 hours a year",
    description:
      "The annual CPD expectation for regulated advisers, the structured minimum, and how to keep a dated record of both.",
    requirement: STANDARDS_FRAMEWORKS.FCA.mandate,
    framework: "FCA",
    output: {
      label: "Your CPD record",
      href: "/record",
      blurb: "Hours by type across the year, exportable for your firm's file.",
    },
    faqs: [
      {
        q: "Who holds the CPD record for an adviser?",
        a: "Your firm is responsible for the record, but the evidence is yours and moves with you. Keeping your own dated copy is what makes a change of employer painless.",
      },
    ],
  },
  {
    slug: "architects",
    body: "ARB",
    bodyName: "the Architects Registration Board",
    audience: "architects registered with ARB, and RIBA chartered members",
    title: "CPD for architects: ARB topics and RIBA hours",
    description:
      "How the ARB scheme and RIBA's core curriculum differ, what each asks for, and how to keep one record that satisfies both.",
    requirement: `${STANDARDS_FRAMEWORKS.ARB.mandate} ${STANDARDS_FRAMEWORKS.RIBA.mandate}`,
    framework: "ARB",
    output: {
      label: "Your CPD record",
      href: "/record",
      blurb: "One topic per activity, as the ARB scheme requires, with hours totalled for RIBA.",
    },
    faqs: [
      {
        q: "Can one activity count for more than one ARB topic?",
        a: "No. The ARB scheme asks for the single most relevant topic, which is why this app makes it a single choice here and a multiple one elsewhere.",
      },
    ],
  },
  {
    slug: "teachers",
    body: "GTCS",
    bodyName: "the General Teaching Council for Scotland",
    audience: "teachers registered with GTCS, EWC in Wales, or GTCNI",
    title: "CPD for teachers: Professional Update and professional learning",
    description:
      "How teaching is regulated differently across the four nations, what Professional Update asks for in Scotland, and how to keep a reflective record of professional learning.",
    requirement:
      "Teaching is regulated separately in each UK nation, and only Scotland ties CPD directly to registration: GTCS registrants confirm Professional Update every five years, keeping a reflective record of professional learning. Wales and Northern Ireland register teachers through EWC and GTCNI. England has no registering body tying CPD to registration, so English teachers keep records for their school or trust rather than a regulator.",
    output: {
      label: "Professional Update record",
      href: "/record/professional-update",
      blurb:
        "Your reflective record across the five-year cycle, with reflection treated as required rather than optional.",
    },
    faqs: [
      {
        q: "Do English teachers have a CPD requirement?",
        a: "Not a statutory one tied to registration. Records are usually kept for a school, trust or appraisal process instead — which is what the general record here is for.",
      },
      {
        q: "How often is Professional Update confirmed?",
        a: "Every five years, which is why the record here defaults to a five-year period rather than the twelve months most other schemes use.",
      },
    ],
  },
  {
    slug: "engineers",
    body: "IMechE",
    bodyName: "the licensed engineering institutions",
    audience:
      "mechanical, civil, electrical, chemical and aerospace engineers registered through IMechE, ICE, IET, IChemE or RAeS",
    title: "Engineering CPD: the annual sample, and what it asks for",
    description:
      "How CPD works for registered engineers, why there is no hours target, and how to produce the twelve-month record the annual sample asks for.",
    requirement:
      "The Engineering Council holds the register, but the CPD obligation is administered by the licensed institution you belong to, and it is that institution which runs the annual audit. Every licensed institution must sample at least 5% of its registrants each year. There is no hours or points target to hit: what is asked for is evidence of planned, reflective development over the preceding twelve months.",
    output: {
      label: "CPD record for sampling",
      href: "/record/engineering",
      blurb:
        "Your last twelve months in the shape the sample asks for, with reflection required and no hours target implied.",
    },
    faqs: [
      {
        q: "How many CPD hours do engineers need?",
        a: "There is no target. The institutions ask for evidence of planned and reflected-on development, which is why this record asks for reflection on every activity but never presents an hours total as a threshold.",
      },
      {
        q: "Who audits engineering CPD — the Engineering Council or my institution?",
        a: "Your institution. The Engineering Council requires each licensed institution to sample at least 5% of its registrants annually, and the request comes from the institution you are registered through.",
      },
    ],
  },
];

export function guideFor(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
