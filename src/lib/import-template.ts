/**
 * The worked example shown on the import page and the file served by
 * /record/import/template are generated from this one definition, so what a
 * user sees on screen is exactly what they get if they download it.
 *
 * The rows are chosen to demonstrate the parser's tolerances rather than to be
 * pretty: two date formats, an accredited and a non-accredited activity, an
 * empty Points cell, and three different activity types.
 */
export const TEMPLATE_COLUMNS = [
  { name: "Date", required: true },
  { name: "Title", required: true },
  { name: "Activity type", required: false },
  { name: "Official CPD", required: false },
  { name: "Points", required: false },
  { name: "Hours", required: false },
  { name: "Provider", required: false },
  { name: "Notes", required: false },
] as const;

export const TEMPLATE_ROWS: string[][] = [
  [
    "14/03/2026",
    "Regional respiratory conference",
    "Formal / educational",
    "Yes",
    "6",
    "6",
    "Royal College of Physicians",
    "Updated my asthma escalation pathway knowledge.",
  ],
  [
    "2026-04-02",
    "Journal club: VTE prophylaxis paper",
    "Professional activity",
    "No",
    "",
    "1",
    "Ward 7 journal club",
    "Presented the paper and led discussion.",
  ],
  [
    "22/05/2026",
    "e-Learning: safeguarding level 2 refresher",
    "Self-directed learning",
    "No",
    "",
    "1.5",
    "e-LfH",
    "",
  ],
];

export const TEMPLATE_HEADERS = TEMPLATE_COLUMNS.map((c) => c.name);
