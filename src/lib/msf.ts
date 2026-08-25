/**
 * Multi-source feedback: the question set colleagues answer about a person.
 *
 * Deliberately unlike the post-event set in ./feedback.ts, and the difference
 * is worth naming so the next reader does not take it for an oversight. That
 * file gives every item its own labels, because a shared agree/disagree
 * battery invites acquiescence. This one uses a single scale across all
 * seventeen rated items, because comparability between items *is* the
 * instrument: the output a person acts on is "you score higher on teamwork
 * than on time management", and a per-item scale destroys exactly that.
 * Every UK multi-source tool is shaped this way for the same reason.
 *
 * "Unable to comment" is not a sixth point on the scale. It is an abstention,
 * stored as zero and excluded from every average — a colleague who has never
 * seen someone teach should not be made to score them on teaching, and a
 * scale that forces the choice manufactures data.
 *
 * No server-only import here, and there must never be one: the response form
 * is a client component and imports this module. Anything touching the
 * database belongs in ./msf-invites.ts.
 *
 * Bump MSF_QUESTION_SET_VERSION whenever wording changes, so answers already
 * given stay interpretable against the questions actually asked.
 */
/* Version 2: the overall question gained its article — "compared to a Band 7"
   rather than "compared to Band 7" — and became optional, asked per rater. */
export const MSF_QUESTION_SET_VERSION = 2;

/** The five real points. Zero is the abstention and is not one of them. */
export const MSF_SCALE_POINTS = 5;
export const MSF_SCALE_LABELS = [
  "Below expectations",
  "Needs development",
  "Satisfactory",
  "Good",
  "Very good",
] as const;

export const MSF_ABSTAIN = 0;
export const MSF_ABSTAIN_LABEL = "Unable to comment";

/** How long colleagues have, and when the one reminder becomes available. */
export const MSF_WINDOW_DAYS = 21;
export const MSF_REMINDER_AFTER_DAYS = 7;

/**
 * Five is the floor because below it a reply is close to attributable, and it
 * is enforced on the server rather than only in the form. Twenty is a ceiling
 * on how much mail one request may generate.
 */
export const MSF_MIN_COLLEAGUES = 5;
export const MSF_MAX_COLLEAGUES = 20;

/** Below this many replies the results carry a caution, as event feedback does. */
export const MSF_SMALL_SAMPLE = 5;

/** What a question is asked about — frozen onto the request when it is created. */
export type MsfCaptions = {
  /** The subject's name, as it read on the day colleagues were asked. */
  name: string;
  /** Profession-appropriate adverb: "scientifically", "clinically", … */
  word: string;
  /** Q17's benchmark, e.g. "a Band 8a clinical scientist". */
  comparedTo: string;
};

export type MsfRatedQuestion = {
  key: string;
  /** The overall comparison is optional, and asked only of chosen raters. */
  optional?: boolean;
  /** Carries {name}, {word} and {compared_to}; interpolated at render. */
  template: string;
  /** Column heading in the results table and the CSV. */
  short: string;
  group: "practice" | "self" | "communication" | "teamwork" | "overall";
};

export type MsfTextQuestion = {
  key: string;
  template: string;
  short: string;
  placeholder: string;
};

export const MSF_RATED_QUESTIONS: MsfRatedQuestion[] = [
  { key: "q1", template: "{name} is able to analyse and solve problems", short: "Problem solving", group: "practice" },
  { key: "q2", template: "{name} deals appropriately with stress", short: "Dealing with stress", group: "self" },
  { key: "q3", template: "{name} maintains their own professional development", short: "Own development", group: "self" },
  { key: "q4", template: "{name} is able to formulate appropriate management plans", short: "Management plans", group: "practice" },
  { key: "q5", template: "{name} makes {word}-appropriate decisions", short: "Decisions", group: "practice" },
  { key: "q6", template: "{name} is aware of their own limitations", short: "Own limitations", group: "self" },
  { key: "q7", template: "{name} manages time well", short: "Time management", group: "self" },
  { key: "q8", template: "{name} is appropriately {word} skilled for their practice", short: "Skill for practice", group: "practice" },
  { key: "q9", template: "{name} is an effective teacher or trainer", short: "Teaching", group: "communication" },
  { key: "q10", template: "{name} can communicate well with the team and staff", short: "Communication", group: "communication" },
  { key: "q11", template: "{name} respects confidentiality", short: "Confidentiality", group: "self" },
  { key: "q12", template: "{name} has good written communication", short: "Written communication", group: "communication" },
  { key: "q13", template: "{name} recognises and values the contribution of others", short: "Values others", group: "teamwork" },
  { key: "q14", template: "{name} gives feedback that is private, honest and supportive", short: "Gives feedback", group: "communication" },
  { key: "q15", template: "{name} works effectively as a team member", short: "Teamwork", group: "teamwork" },
  { key: "q16", template: "{name} is accessible and reliable", short: "Accessible and reliable", group: "teamwork" },
  { key: "q17", template: "Overall, compared to {a_compared_to}, I rate {name}:", short: "Overall", group: "overall", optional: true },
];

export const MSF_TEXT_QUESTIONS: MsfTextQuestion[] = [
  {
    key: "q18",
    template: "Please describe areas of strength or good practice",
    short: "Strengths",
    placeholder: "e.g. explains complex results to families without ever sounding rushed",
  },
  {
    key: "q19",
    template: "Please describe any areas that should be a particular focus for development in the future",
    short: "Development",
    placeholder: "Specific and forward-looking is more use than general praise",
  },
  {
    key: "q20",
    template: "If you were describing {name} to a very good friend, what would be the first words that come to your mind?",
    short: "First words",
    placeholder: "",
  },
];

export const MSF_QUESTION_COUNT = MSF_RATED_QUESTIONS.length + MSF_TEXT_QUESTIONS.length;

/**
 * "a Band 7", "an SHO", "the head of department" — the comparator reads
 * mid-sentence, so it needs its article unless it brought its own.
 */
export function withArticle(phrase: string): string {
  const p = phrase.trim();
  if (/^(a|an|the|my|our|your)\s/i.test(p)) return p;
  return `${/^[aeiou]/i.test(p) ? "an" : "a"} ${p}`;
}

/** Fills a template from the captions frozen on the request. */
export function renderMsfQuestion(template: string, captions: MsfCaptions): string {
  return template
    .replace(/\{name\}/g, captions.name)
    .replace(/\{word\}/g, captions.word)
    .replace(/\{a_compared_to\}/g, withArticle(captions.comparedTo))
    .replace(/\{compared_to\}/g, captions.comparedTo);
}

export type MsfItemSummary = {
  question: MsfRatedQuestion;
  /** Mean of the answers that were answers; null when everybody abstained. */
  mean: number | null;
  /** How many people rated it, i.e. excluding abstentions. */
  rated: number;
  abstained: number;
  /** Counts for scale points 1..5, in order. */
  distribution: number[];
};

export type MsfGap = {
  question: MsfRatedQuestion;
  /** What colleagues gave, on average. */
  mean: number;
  /** What the subject gave themselves. */
  own: number;
  /** mean − own: negative where colleagues rated lower than the subject did. */
  gap: number;
};

/**
 * Self-rating against colleague mean, per question — the raw material of a
 * development plan. Only items both sides actually rated: an abstained self-
 * answer or an all-abstained colleague mean compares nothing with nothing.
 * Sorted most-negative first, because the biggest gap is the first goal.
 */
export function msfGaps(
  summaries: MsfItemSummary[],
  selfAnswers: Record<string, number | string | null> | undefined
): MsfGap[] {
  if (!selfAnswers) return [];
  return summaries
    .flatMap((item) => {
      const own = Number(selfAnswers[item.question.key] ?? 0);
      if (item.mean === null || own < 1 || own > MSF_SCALE_POINTS) return [];
      return [{ question: item.question, mean: item.mean, own, gap: item.mean - own }];
    })
    .sort((a, b) => a.gap - b.gap);
}

/**
 * Aggregates one item.
 *
 * Abstentions are counted and reported but never averaged: a question eleven
 * people skipped and one person rated "Good" is not a four out of five, and
 * showing it as one would be the most flattering lie in the report.
 */
export function summariseMsfItem(
  question: MsfRatedQuestion,
  values: number[]
): MsfItemSummary {
  const rated = values.filter((v) => v >= 1 && v <= MSF_SCALE_POINTS);
  const distribution = MSF_SCALE_LABELS.map((_, i) => rated.filter((v) => v === i + 1).length);
  return {
    question,
    mean: rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null,
    rated: rated.length,
    abstained: values.length - rated.length,
    distribution,
  };
}

/**
 * A stable order for written answers that does not follow arrival.
 *
 * Sorting by row id would tell the subject who answered first, which — for
 * anyone who nudged a particular colleague — is a thread worth pulling. A hash
 * of the text is arbitrary but consistent between page loads, so the report
 * does not reshuffle itself every time it is opened.
 */
export function commentOrder(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return hash;
}
