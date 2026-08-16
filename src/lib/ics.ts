/**
 * iCalendar (RFC 5545) output.
 *
 * Written by hand rather than pulled from a library: the format is small, and
 * the parts that actually break interoperability — CRLF line endings, folding
 * long lines, escaping, stable UIDs, a real VTIMEZONE — are exactly the parts
 * a dependency would hide from us. Google, Apple and Outlook each forgive
 * different mistakes, so none of them can be used alone to prove this correct.
 */

export type CalendarEvent = {
  /** Stable for the life of the event: changing it creates a duplicate. */
  uid: string;
  title: string;
  /** YYYY-MM-DD. */
  startsOn: string;
  /** YYYY-MM-DD. Inclusive — the last day of the event, not the day after. */
  endsOn?: string | null;
  /** HH:MM. Omit both times for an all-day entry. */
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  description?: string | null;
  url?: string | null;
  /** Incremented on every change, so subscribers notice edits. */
  sequence?: number;
  /** When the event record last changed, ISO 8601. */
  updatedAt?: string | null;
};

/**
 * Everything in this app happens in UK local time, and users read their
 * calendars in it. Emitting UTC would be simpler but would show a 10:00
 * conference at 09:00 for half the year, so the zone is carried properly.
 * These rules are the UK's since 1996 and are what every client expects.
 */
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/London",
  "X-LIC-LOCATION:Europe/London",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0000",
  "TZOFFSETTO:+0100",
  "TZNAME:BST",
  "DTSTART:19700329T010000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0000",
  "TZNAME:GMT",
  "DTSTART:19701025T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

/** Backslash, semicolon, comma and newline all mean something in this format. */
function escape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Lines are limited to 75 octets. Counting characters instead would break on
 * any accented name or curly apostrophe — of which this app's copy has many.
 */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const out: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Never split a multi-byte character: continuation bytes are 10xxxxxx.
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    out.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // continuation lines start with a space, which counts
  }
  return out.join("\r\n ");
}

const stamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d+/, "").replace(/Z?$/, "Z");
const dateOnly = (ymd: string) => ymd.replace(/-/g, "");
const local = (ymd: string, hm: string) => `${dateOnly(ymd)}T${hm.replace(":", "")}00`;

/** The day after the last day: DTEND is exclusive for all-day events. */
function dayAfter(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return dateOnly(d.toISOString().slice(0, 10));
}

function renderEvent(event: CalendarEvent, now: string): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${stamp(event.updatedAt ?? now)}`,
    `SEQUENCE:${event.sequence ?? 0}`,
    `SUMMARY:${escape(event.title)}`,
  ];

  if (event.startTime) {
    const endDay = event.endsOn ?? event.startsOn;
    // An end time is not required of the user, so an event without one is
    // given an hour rather than being emitted as zero-length, which some
    // clients draw as an invisible sliver.
    const endTime = event.endTime ?? addHour(event.startTime);
    lines.push(`DTSTART;TZID=Europe/London:${local(event.startsOn, event.startTime)}`);
    lines.push(`DTEND;TZID=Europe/London:${local(endDay, endTime)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${dateOnly(event.startsOn)}`);
    lines.push(`DTEND;VALUE=DATE:${dayAfter(event.endsOn ?? event.startsOn)}`);
  }

  if (event.location) lines.push(`LOCATION:${escape(event.location)}`);
  if (event.description) lines.push(`DESCRIPTION:${escape(event.description)}`);
  if (event.url) lines.push(`URL:${escape(event.url)}`);
  lines.push("END:VEVENT");
  return lines;
}

function addHour(hm: string): string {
  const [h, m] = hm.split(":").map(Number);
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function renderCalendar(
  events: CalendarEvent[],
  { name, description }: { name: string; description?: string }
): string {
  const now = new Date().toISOString();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CPD Register//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(name)}`,
    "X-WR-TIMEZONE:Europe/London",
    ...(description ? [`X-WR-CALDESC:${escape(description)}`] : []),
    // How often a client should look again. Advisory — Google in particular
    // refreshes on its own schedule — but Apple and Outlook honour it.
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...VTIMEZONE,
    ...events.flatMap((e) => renderEvent(e, now)),
    "END:VCALENDAR",
  ];
  // CRLF throughout, and a trailing one: some parsers drop the last line
  // without it.
  return lines.map(fold).join("\r\n") + "\r\n";
}
