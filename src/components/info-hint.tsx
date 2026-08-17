/**
 * An explanation folded behind a small "i".
 *
 * A `details` element rather than a button with state: it opens without
 * JavaScript, announces itself to a screen reader as a disclosure, and needs
 * no client component. The label goes on the summary rather than being left
 * to the glyph, so "i" is not the only thing a screen reader has to work with.
 */
export function InfoHint({ label = "What does this mean?", children }: { label?: string; children: React.ReactNode }) {
  return (
    <details className="info">
      <summary className="info__mark" aria-label={label} title={label}>
        i
      </summary>
      <div className="hint info__body">{children}</div>
    </details>
  );
}
