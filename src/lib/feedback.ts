/**
 * Post-event feedback question set.
 *
 * The items are utility/intention questions rather than satisfaction ones: in
 * Alliger et al.'s meta-analysis, affective "did you enjoy it" reactions
 * correlated ~.02 with learning while utility reactions correlated .26 and
 * predicted on-the-job transfer better than learning measures did. Q3 mirrors
 * the intention construct of the validated CPD-Reaction instrument.
 *
 * Each item carries its own labels rather than a shared agree/disagree scale,
 * which removes the acquiescence hook a generic agreement battery creates.
 * Every point is labelled: full labelling roughly doubles test-retest
 * reliability versus labelling only the endpoints, and labelling all five is
 * what caps the scale at five points rather than seven.
 *
 * Bump QUESTION_SET_VERSION whenever wording changes, so responses already
 * collected stay interpretable against the questions actually asked.
 */
export const QUESTION_SET_VERSION = 1;

export type FeedbackQuestionKey = "q1" | "q2" | "q3" | "q4" | "q5";

export type FeedbackQuestion = {
  key: FeedbackQuestionKey;
  text: string;
  /** Column heading in the organiser's view and CSV export. */
  short: string;
  labels: [string, string, string, string, string];
  /** Q1–Q3 average into a "learning value" score; the other two stand alone. */
  group: "learning" | "delivery" | "recommend";
};

export const FEEDBACK_QUESTIONS: FeedbackQuestion[] = [
  {
    key: "q1",
    text: "How relevant was this session to your current or future practice?",
    short: "Relevance",
    labels: [
      "Not at all relevant",
      "Slightly relevant",
      "Moderately relevant",
      "Very relevant",
      "Extremely relevant",
    ],
    group: "learning",
  },
  {
    key: "q2",
    // Phrased as increment rather than level: experienced clinicians hit a
    // ceiling on "I learned a lot", which confounds a weak session with an
    // already-expert audience.
    text: "How much did this add to what you already knew?",
    short: "Perceived learning gain",
    labels: ["Nothing new", "A little", "A fair amount", "A lot", "A great deal"],
    group: "learning",
  },
  {
    key: "q3",
    text: "How likely are you to do something differently in your practice as a result?",
    short: "Intent to change practice",
    labels: [
      "Not at all likely",
      "Slightly likely",
      "Moderately likely",
      "Very likely",
      "Extremely likely",
    ],
    group: "learning",
  },
  {
    key: "q4",
    text: "How well was the session delivered — clarity, pace and structure?",
    short: "Delivery",
    labels: ["Poor", "Fair", "Good", "Very good", "Excellent"],
    group: "delivery",
  },
  {
    key: "q5",
    text: "Would you recommend this session to a colleague?",
    short: "Would recommend",
    labels: ["Definitely not", "Probably not", "Not sure", "Probably", "Definitely"],
    group: "recommend",
  },
];

export const SCALE_POINTS = 5;

export const FEEDBACK_COMMENT_PROMPT = "What worked well, and what one thing would you change?";

export const FEEDBACK_COMMENT_HINT =
  "Critical comments are just as welcome as compliments — both help the organiser. Your name is not attached to this.";

export const FEEDBACK_COMMENT_PLACEHOLDER =
  "e.g. the case discussions were the most useful part; the room was too hot to concentrate after lunch";

/**
 * Feedback is released to the organiser as soon as it exists — withholding it
 * would leave small events (journal clubs, in-house teaching) permanently
 * unable to see responses their attendees chose to give.
 *
 * Below this many responses the organiser sees a caution instead: the figures
 * are indicative rather than representative, and in a small group a comment can
 * be traceable from its content even though no name is attached to it. The
 * attendee-facing copy says the same, so nobody is promised more anonymity than
 * the numbers can actually deliver.
 */
export const SMALL_SAMPLE_CAUTION = 5;
