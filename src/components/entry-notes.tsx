/**
 * Renders an entry's notes.
 *
 * The importer keeps every column a structured field didn't claim, one per
 * line as "Heading: value". Rendered as plain text those newlines collapse and
 * four distinct columns read as one run-on paragraph — the data is all there
 * but none of it is findable. Splitting them back out is what makes "we kept
 * your columns" visible rather than merely true.
 *
 * Notes typed by hand have no headings and are shown as written.
 */

/** "Impact on Practice: It was useful…" — a heading, then its content. */
const LABELLED = /^([^:\n]{2,60}):\s*(.+)$/s;

export function EntryNotes({ notes, className }: { notes: string; className?: string }) {
  const lines = notes.split("\n").filter((l) => l.trim() !== "");
  const parsed = lines.map((line) => {
    const m = line.match(LABELLED);
    return m ? { label: m[1].trim(), value: m[2].trim() } : { label: null, value: line.trim() };
  });

  // Nothing labelled, or a single unlabelled note: show it as written.
  if (!parsed.some((p) => p.label)) {
    return <div className={className}>{notes}</div>;
  }

  return (
    <dl className={`entry-notes ${className ?? ""}`}>
      {parsed.map((p, i) =>
        p.label ? (
          <div className="entry-notes__row" key={i}>
            <dt className="entry-notes__label">{p.label}</dt>
            <dd className="entry-notes__value">{p.value}</dd>
          </div>
        ) : (
          <div className="entry-notes__row" key={i}>
            <dd className="entry-notes__value">{p.value}</dd>
          </div>
        )
      )}
    </dl>
  );
}
