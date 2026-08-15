import "server-only";
import ExcelJS from "exceljs";
import { ACTIVITY_TYPES } from "./format";

export type ParsedEntry = {
  title: string;
  activity_date: string;
  activity_type: string;
  is_official: number;
  points: number | null;
  hours: number | null;
  provider: string | null;
  notes: string | null;
  /** Raw codes as written in the sheet; validated against the user's framework on commit. */
  standards: string | null;
};

export type ImportResult = {
  entries: ParsedEntry[];
  issues: string[];
  totalRows: number;
  /**
   * What became of each column in the file. A migration tool has to be able to
   * answer "did you keep my data?" before the user commits, not after — and
   * silence reads as loss even when nothing was lost.
   */
  mapping: {
    /** Your heading -> the field it filled. */
    matched: { header: string; field: string }[];
    /** Your headings kept inside the notes, labelled. */
    carriedToNotes: string[];
    /** Headings with no data under them anywhere. */
    ignored: string[];
  };
};

const HEADER_ALIASES: Record<keyof typeof COLUMN_LABELS, string[]> = {
  date: ["date", "activity date", "event date", "date of activity", "when", "completed", "date completed"],
  title: [
    "title",
    "activity",
    "event",
    "activity title",
    "event title",
    "name",
    "description of activity",
    "description",
    "topic",
    "subject",
  ],
  type: [
    "type",
    "activity type",
    "category",
    "learning type",
    "type of activity",
    "type of learning",
    "cpd type",
    "learning category",
  ],
  official: ["official", "official cpd", "accredited", "accreditation", "accredited cpd"],
  points: ["points", "credits", "cpd points", "cpd credits", "point", "credit"],
  hours: [
    "hours",
    "learning hours",
    "duration",
    "time",
    "duration hours",
    "hrs",
    "hours spent",
    "no of hours",
    "number of hours",
    "cpd hours",
    "time spent",
    "time hours",
    "time spent hours",
    "duration hrs",
    "length",
  ],
  provider: [
    "provider",
    "organiser",
    "organizer",
    "organisation",
    "organization",
    "host",
    "venue",
    "accrediting body",
    "delivered by",
    "run by",
    "presenter",
  ],
  notes: [
    "notes",
    "reflection",
    "learning outcomes",
    "outcome",
    "comments",
    "reflection notes",
    "what did you learn",
    "learning objectives",
    "objectives",
    "objective",
    "learning outcome",
  ],
  standards: [
    "standard",
    "standards",
    "cpd standard",
    "cpd standards",
    "hcpc standard",
    "hcpc standards",
    "development outcome",
    "development outcomes",
    "outcomes met",
    "standards met",
    "domain",
    "domains",
  ],
};

/** Priority order in which columns are assigned — essential columns are matched
 *  first so a fuzzy match on a less important column can't steal their header. */
const COLUMN_PRIORITY: (keyof typeof COLUMN_LABELS)[] = [
  "date",
  "title",
  "type",
  "official",
  "points",
  "hours",
  "provider",
  "notes",
  "standards",
];

function normaliseHeader(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Finds the first unclaimed header matching any alias, exact match first, then
 *  whole-word substring (so "No. of Hours" matches the "hours" alias, etc.). */
function matchColumn(headers: string[], aliases: string[], claimed: Set<number>): number {
  const normalisedHeaders = headers.map(normaliseHeader);
  const normalisedAliases = aliases.map(normaliseHeader);

  for (let i = 0; i < normalisedHeaders.length; i++) {
    if (claimed.has(i)) continue;
    if (normalisedAliases.includes(normalisedHeaders[i])) return i;
  }
  for (let i = 0; i < normalisedHeaders.length; i++) {
    if (claimed.has(i)) continue;
    const header = normalisedHeaders[i];
    if (normalisedAliases.some((alias) => new RegExp(`(^| )${escapeRegExp(alias)}( |$)`).test(header))) return i;
  }
  return -1;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const COLUMN_LABELS = {
  date: "Date",
  title: "Title",
  type: "Activity type",
  official: "Official CPD",
  points: "Points",
  hours: "Hours",
  provider: "Provider",
  notes: "Notes",
  standards: "CPD standard",
} as const;

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
    if ("result" in value) return cellToString(value.result as ExcelJS.CellValue);
    if ("text" in value) return cellToString(value.text as ExcelJS.CellValue);
    if ("hyperlink" in value) return String(value.hyperlink);
    return "";
  }
  return String(value);
}

export async function parseXlsx(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      values[colNumber - 1] = cellToString(cell.value).trim();
    });
    for (let i = 0; i < values.length; i++) if (values[i] === undefined) values[i] = "";
    rows.push(values);
  });
  return rows.filter((r) => r.some((c) => c !== ""));
}

export function normaliseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return buildDate(m[1], m[2], m[3]);

  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (m) return buildDate(m[3], m[2], m[1]);

  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2})$/);
  if (m) return buildDate(String(2000 + Number(m[3])), m[2], m[1]);

  const serial = Number(s);
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return d.toISOString().slice(0, 10);
  }

  const parsed = new Date(s);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1950 && parsed.getFullYear() < 2100) {
    return (
      parsed.getFullYear() +
      "-" +
      String(parsed.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(parsed.getDate()).padStart(2, "0")
    );
  }
  return null;
}

function buildDate(y: string, mo: string, d: string): string | null {
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function mapActivityType(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return "Other";
  const exact = ACTIVITY_TYPES.find((t) => t.toLowerCase() === s);
  if (exact) return exact;
  if (/work[\s-]?based|on the job|in[\s-]?service|clinical audit|supervis/.test(s)) return "Work-based learning";
  if (/formal|educational|course|conference|lecture|seminar|study day|workshop|degree|module|training/.test(s))
    return "Formal / educational";
  if (/self|reading|journal|e-?learning|online|podcast|research/.test(s)) return "Self-directed learning";
  if (/professional|committee|mentoring|teaching|presentation|society|branch/.test(s)) return "Professional activity";
  return "Other";
}

/**
 * Pulls codes out of free text like "2 & 3", "Standards 1,4", "A; C" or "10".
 * Deliberately permissive — anything that isn't a code the user's own framework
 * defines is discarded on commit, so over-matching here is harmless.
 */
function parseStandardCodes(raw: string): string | null {
  const codes = raw.toUpperCase().match(/\b(\d{1,2}|[A-Z])\b/g);
  if (!codes) return null;
  const unique = [...new Set(codes)];
  return unique.length ? unique.join(",") : null;
}

function parseOfficial(raw: string): number {
  return /^(y|yes|true|1|official|accredited)$/i.test(raw.trim()) ? 1 : 0;
}

function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/[^0-9.\-]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function mapRows(rows: string[][]): ImportResult {
  if (rows.length === 0)
    return {
      entries: [],
      issues: ["The file contains no rows."],
      totalRows: 0,
      mapping: { matched: [], carriedToNotes: [], ignored: [] },
    };

  const headerIndex = findHeaderRow(rows);
  if (headerIndex === -1) {
    return {
      entries: [],
      issues: [
        `Could not find a header row. The first row should contain column names — at minimum "${COLUMN_LABELS.date}" and "${COLUMN_LABELS.title}" (or close equivalents such as "Activity" or "Event").`,
      ],
      mapping: { matched: [], carriedToNotes: [], ignored: [] },
      totalRows: rows.length,
    };
  }

  const headers = rows[headerIndex];
  const col: Partial<Record<keyof typeof COLUMN_LABELS, number>> = {};
  const claimed = new Set<number>();
  for (const key of COLUMN_PRIORITY) {
    const idx = matchColumn(headers, HEADER_ALIASES[key], claimed);
    if (idx !== -1) {
      col[key] = idx;
      claimed.add(idx);
    }
  }

  // Every column a structured field didn't claim. A CPD sheet routinely carries
  // several reflective columns — "Reflection", "Impact on practice", "Learning
  // outcome" — and only one of them can win the notes slot. Rather than
  // discarding the rest (silent data loss on a migration tool), each is kept in
  // the notes, labelled with the heading it came from.
  const carriedOver = headers
    .map((header, index) => ({ header: (header ?? "").trim(), index }))
    .filter((c) => c.header !== "" && !claimed.has(c.index));

  const notesHeader = col.notes !== undefined ? (headers[col.notes] ?? "").trim() : "";

  const entries: ParsedEntry[] = [];
  const issues: string[] = [];
  const dataRows = rows.slice(headerIndex + 1);

  /**
   * The recognised notes column plus every unclaimed column, each labelled with
   * its original heading so the user can see where their text came from. When
   * nothing was carried over the notes are left unlabelled, since a lone
   * "Reflection: …" prefix on an otherwise clean import is just noise.
   */
  const buildNotes = (row: string[]): string | null => {
    const primary = col.notes !== undefined ? (row[col.notes] ?? "").trim() : "";
    const extras = carriedOver
      .map((c) => {
        const value = (row[c.index] ?? "").trim();
        return value ? `${c.header}: ${value}` : "";
      })
      .filter(Boolean);

    if (extras.length === 0) return primary.slice(0, 4000) || null;

    const labelledPrimary = primary ? `${notesHeader || "Notes"}: ${primary}` : "";
    return [labelledPrimary, ...extras].filter(Boolean).join("\n").slice(0, 4000) || null;
  };

  dataRows.forEach((row, i) => {
    const rowNumber = headerIndex + i + 2;
    const get = (key: keyof typeof COLUMN_LABELS) => (col[key] !== undefined ? (row[col[key]!] ?? "").trim() : "");

    const title = get("title");
    const dateRaw = get("date");
    if (!title && !dateRaw) return;
    if (!title) {
      issues.push(`Row ${rowNumber}: skipped — no title.`);
      return;
    }
    const date = normaliseDate(dateRaw);
    if (!date) {
      issues.push(
        `Row ${rowNumber} ("${title.slice(0, 40)}"): skipped — ${
          dateRaw ? `unrecognised date "${dateRaw}"` : "no date"
        }.`
      );
      return;
    }

    entries.push({
      title: title.slice(0, 200),
      activity_date: date,
      activity_type: mapActivityType(get("type")),
      is_official: parseOfficial(get("official")),
      points: parseNumber(get("points")),
      hours: parseNumber(get("hours")),
      provider: get("provider").slice(0, 200) || null,
      notes: buildNotes(row),
      standards: parseStandardCodes(get("standards")),
    });
  });

  // Everything the file contained, and where it went.
  const matched = (Object.keys(col) as (keyof typeof COLUMN_LABELS)[])
    .map((key) => ({ header: (headers[col[key]!] ?? "").trim(), field: COLUMN_LABELS[key] }))
    .filter((m) => m.header !== "");

  // A carried-over column with no data in any row is noise, not content.
  const carriedWithData = carriedOver.filter((c) =>
    dataRows.some((row) => (row[c.index] ?? "").trim() !== "")
  );

  return {
    entries,
    issues,
    totalRows: dataRows.length,
    mapping: {
      matched,
      carriedToNotes: carriedWithData.map((c) => c.header),
      ignored: carriedOver.filter((c) => !carriedWithData.includes(c)).map((c) => c.header),
    },
  };
}

function findHeaderRow(rows: string[][]): number {
  const limit = Math.min(rows.length, 10);
  for (let i = 0; i < limit; i++) {
    const claimed = new Set<number>();
    const hasDate = matchColumn(rows[i], HEADER_ALIASES.date, claimed) !== -1;
    const hasTitle = matchColumn(rows[i], HEADER_ALIASES.title, claimed) !== -1;
    if (hasDate && hasTitle) return i;
  }
  return -1;
}

export async function parseSpreadsheet(fileName: string, buffer: Buffer): Promise<string[][]> {
  const name = fileName.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) return parseXlsx(buffer);
  if (name.endsWith(".xls"))
    throw new Error(
      "Legacy .xls files are not supported — open the file in Excel and save it as .xlsx or .csv, then try again."
    );
  return parseCsv(buffer.toString("utf-8"));
}
