import type { PackSelection } from "@/lib/pack-columns";

/**
 * Choose what the pack shows.
 *
 * A plain GET form, so the choice lives in the URL: the printed page matches
 * what is on screen, and the same link reproduces the same document later —
 * which matters when the document is evidence someone else may re-open.
 *
 * Locked columns are shown checked and disabled with the reason beside them,
 * and are re-added server-side regardless of what is submitted.
 */
export function PackColumnsForm({
  selection,
  hiddenFields,
}: {
  selection: PackSelection;
  /** Period and anything else the pack already reads from the query string. */
  hiddenFields: Record<string, string>;
}) {
  const { available, visible, locks } = selection;

  return (
    <form method="get" className="card no-print">
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {/* Present even when nothing is ticked, so an empty submission still
          reads as a choice rather than as "no preference expressed". */}
      <input type="hidden" name="cols" value="" />

      <h2>What this pack includes</h2>
      <p className="muted small">
        Some columns can&rsquo;t be removed — either your regulator asks for them, or the pack
        stops being a dated record without them. The reason is given for each.
      </p>

      <div className="pack-cols">
        {available.map((column) => {
          const lockedBecause = locks.get(column.id);
          const isLocked = lockedBecause !== undefined;
          return (
            <label className={`pack-col${isLocked ? " pack-col--locked" : ""}`} key={column.id}>
              <input
                type="checkbox"
                name="cols"
                value={column.id}
                defaultChecked={visible.has(column.id)}
                disabled={isLocked}
              />
              <span>
                <span className="pack-col__label">
                  {column.label}
                  {isLocked && <span className="pack-col__pill">Required</span>}
                </span>
                <span className="pack-col__hint">{lockedBecause ?? column.hint}</span>
              </span>
            </label>
          );
        })}
      </div>

      <button type="submit" className="btn btn--secondary">
        Update the pack
      </button>
    </form>
  );
}
