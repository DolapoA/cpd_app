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
    title: "HCPC CPD audit: what to keep, how many hours, and what the profile needs",
    description:
      "How the HCPC CPD audit works, why there is no hours target, what a CPD profile has to show, and how to keep a dated record ready for your two-year renewal.",
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
        q: "How does the HCPC CPD audit work?",
        a: "At each two-year renewal the HCPC selects a random sample of registrants from every profession and asks them for a CPD profile: a summary of your practice, a statement of how your CPD met the standards, and evidence for it. The profile can only be written from a record that already exists — which is why the audit pack here defaults to your renewal cycle.",
      },
      {
        q: "What CPD evidence does the HCPC accept?",
        a: "Anything that shows the activity happened and what you took from it: certificates, notes, reflective statements and dated attendance. A slip signed live at the event, carrying a code an auditor can check online, is the strongest form of the last; a reflection written the same evening is the strongest form of the first.",
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
    title: "GMC appraisal CPD evidence: what to bring, and how to show reflection",
    description:
      "What CPD evidence a GMC appraisal expects as supporting information, how reflection turns attendance into evidence, and how to produce a dated appraisal summary.",
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
        q: "What CPD evidence does GMC appraisal need?",
        a: "A dated record of the learning you did across the appraisal year, with reflection on what it changed in your practice — it is the reflection that makes CPD supporting information rather than a list of courses. Colleague feedback and a personal development plan sit beside it in the same portfolio; both have their own guides here.",
      },
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
    title: "NMC revalidation CPD: the hours, the log, and the Code",
    description:
      "How many CPD hours NMC revalidation asks for over three years, what the log must record against the Code, and how to keep it as you go rather than at renewal.",
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
        q: "How many CPD hours does NMC revalidation need?",
        a: "The NMC asks for 35 hours of CPD in the three years before each renewal, at least 20 of them participatory — learning done with other people rather than alone. Check the NMC's own revalidation guidance for the current wording. Every entry here carries its hours, so the three-year total is a sum rather than a reconstruction.",
      },
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
  {
    slug: "multi-source-feedback",
    body: "MSF",
    bodyName: "multi-source feedback",
    audience:
      "doctors preparing for appraisal and revalidation, and any professional using colleague feedback for personal development planning",
    title: "Multi-source feedback (MSF): colleague feedback for your personal development plan",
    description:
      "What multi-source feedback is, how anonymous colleague feedback evidences professionalism, and how to turn an MSF round into the development goals in your personal development plan.",
    requirement:
      "Multi-source feedback — also called MSF, 360-degree feedback or colleague feedback — asks the people you work with to rate how you practise: clinical judgement, communication, teamwork, reliability and professionalism, against a fixed set of questions. It matters because it measures what no certificate can: how you actually work, seen by the people who work with you. The GMC lists colleague feedback among the supporting information doctors bring to appraisal, expected at least once per five-year revalidation cycle, and appraisal and development frameworks across other professions use the same instrument. Its output is the starting point of a personal development plan — the gap between how you rate yourself and how colleagues rate you is precisely where development goals come from.",
    output: {
      label: "Ask your colleagues for feedback",
      href: "/record/colleague-feedback",
      blurb:
        "Each colleague gets a private single-use link and answers anonymously. You complete the same questions about yourself, results open after 21 days, and the gap between the two is your development plan's raw material — filed under an MSF reference an appraiser can cite.",
    },
    faqs: [
      {
        q: "What is multi-source feedback (MSF)?",
        a: "A structured way of collecting anonymous feedback about how you practise from the colleagues who work with you — usually 16 to 20 rated questions covering clinical decisions, communication, teamwork and professionalism, plus written comments on strengths and areas to develop. It is sometimes called 360-degree feedback or colleague feedback; the instrument is the same.",
      },
      {
        q: "How does MSF feed a personal development plan?",
        a: "You answer the same questions about yourself before seeing anyone else's answers. The results then show your self-rating beside your colleagues' average on every question, and the gaps are your personal development plan writing itself: an item colleagues rate lower than you did is a development goal, and one they rate higher is a strength you can evidence. Repeating MSF in a later cycle shows whether the plan worked. The personal development plan guide covers what each goal then needs to say.",
      },
      {
        q: "Is MSF evidence of professionalism?",
        a: "It is close to the only direct evidence of it. Certificates show attendance and reflection shows insight, but professionalism — respecting confidentiality, valuing colleagues, being accessible and reliable — is visible chiefly to the people you work with. A pooled, anonymous rating from them is how appraisal frameworks measure it.",
      },
      {
        q: "How many colleagues should I ask, and which?",
        a: "More than you think, and more varied. Response rates run around half to two-thirds, so ten to twelve invitations is a sensible floor, and a mix of seniors, peers and people you supervise gives the rounded view the exercise is named for. This app requires at least five, and lets you choose per colleague whether they are asked the overall comparison question.",
      },
      {
        q: "Is the feedback really anonymous?",
        a: "Here, yes, structurally: a colleague's answers are stored with no link to who gave them — no name, no email, no date — so nobody, including us, can attribute a reply. You see who you invited and how many responded, never which. The one honest caveat is written comments: a turn of phrase can identify its author, and colleagues are told so before they write.",
      },
      {
        q: "Is MSF required for GMC revalidation?",
        a: "The GMC expects doctors to collect and reflect on feedback from colleagues at least once per five-year revalidation cycle, discussed at appraisal alongside the other supporting information. Other regulators generally do not mandate MSF by name, but appraisal and development conversations across professions accept it as strong evidence — check your own body's wording before relying on it.",
      },
    ],
  },
  {
    slug: "personal-development-plan",
    body: "PDP",
    bodyName: "the personal development plan",
    audience:
      "doctors preparing for appraisal, and any UK professional whose review expects agreed development goals",
    title: "Personal development plan (PDP): writing goals your appraisal can sign off",
    description:
      "What a personal development plan is, the five parts of a PDP goal appraisers look for, and how to review goals as achieved, carried forward or no longer relevant.",
    requirement:
      "A personal development plan is the forward-looking half of professional development: where CPD records what you did, a PDP states what you are working on becoming. Each goal names a development need, how it was identified, what you will do about it, how achievement will be shown, and a target date. For doctors it is a formal output of GMC appraisal — a new plan agreed each year, with progress on the old one (or an explanation) expected at the next; appraisal and review frameworks across other professions ask for the same structure under different names. A goal is reviewed, not just kept: achieved, carried forward with a new date, or honestly retired as no longer relevant.",
    output: {
      label: "Start your development plan",
      href: "/record/development",
      blurb:
        "A goal is a need, what you'll do, how you'll show it worked, and a date. Link CPD entries and planned events to it as evidence, and review each goal at appraisal: achieved, carried forward, or no longer relevant.",
    },
    faqs: [
      {
        q: "What is a personal development plan (PDP)?",
        a: "A short, agreed list of development goals: what you need to develop, how the need was identified, the actions you will take, how achievement will be demonstrated, and a target date. It is the document an appraisal or professional review keeps returning to — last year's plan is reviewed, next year's is agreed.",
      },
      {
        q: "What makes a development goal SMART?",
        a: "Specific, measurable, achievable, relevant and time-bound. In practice: name one capability rather than a theme, say what you will actually do, define what an appraiser could look at and agree it happened, keep it within your role's reach, and give it a date. \"Improve leadership\" is a theme; \"chair the monthly governance meeting from March and collect feedback from two attendees\" is a goal.",
      },
      {
        q: "Where do development goals come from?",
        a: "From evidence, not introspection alone: appraisal discussions, audit results, complaints and compliments, and structured feedback. Multi-source feedback is the sharpest source — the questions colleagues rate you lower on than you rated yourself are development needs already identified and evidenced.",
      },
      {
        q: "What happens to a goal at review?",
        a: "One of three verdicts. Achieved, with a line of reflection on what changed. Carried forward, with a new target date and a note on why it needs longer. Or no longer relevant, because roles and priorities move — retiring a goal honestly reads far better at appraisal than a plan nothing ever leaves.",
      },
      {
        q: "Is a PDP required?",
        a: "For doctors, yes in effect: GMC appraisal expects a PDP agreed each year and progress against it, or an explanation, at the next. Most other UK regulators do not mandate a PDP by name, but reflective frameworks — the HCPC's standards, the NMC's revalidation reflections, professional review in engineering and teaching — all assume development is planned rather than accidental. An agreed list of goals with review dates satisfies all of them.",
      },
      {
        q: "How does a PDP connect to CPD?",
        a: "The plan says why the learning happened. A course chosen against a stated development need, with the outcome reviewed, is a stronger appraisal story than the same course attended at random — and auditors read it that way. Recording CPD against the goal it serves turns a list of certificates into evidence of development.",
      },
    ],
  },
];

export function guideFor(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

/**
 * What to read after each guide — chosen, not computed. The rail already lists
 * every other guide; this is the two or three a reader of this one actually
 * has a reason to open next, which is what a search engine reads as a link
 * that means something.
 */
export const RELATED_GUIDES: Record<string, string[]> = {
  hcpc: ["nmc", "personal-development-plan", "multi-source-feedback"],
  gmc: ["multi-source-feedback", "personal-development-plan", "hcpc"],
  nmc: ["hcpc", "personal-development-plan"],
  gphc: ["personal-development-plan", "hcpc"],
  gdc: ["personal-development-plan", "gphc"],
  rics: ["architects", "engineers"],
  "financial-advisers": ["rics", "personal-development-plan"],
  architects: ["rics", "engineers"],
  teachers: ["personal-development-plan", "multi-source-feedback"],
  engineers: ["architects", "rics", "personal-development-plan"],
  "multi-source-feedback": ["personal-development-plan", "gmc"],
  "personal-development-plan": ["multi-source-feedback", "gmc", "hcpc"],
};

export function relatedGuides(slug: string): Guide[] {
  return (RELATED_GUIDES[slug] ?? []).map(guideFor).filter((g): g is Guide => !!g);
}
