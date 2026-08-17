/**
 * The shapes a page shows while its data is on its way.
 *
 * Deliberately shaped like the page that follows rather than a spinner: the
 * point is that the layout stops moving once the real content lands, so the
 * eye has somewhere to settle. A skeleton that does not match what arrives is
 * worse than none — it makes the page look like it changed its mind.
 *
 * Server components. Nothing here is interactive, and a loading state that
 * needed JavaScript to appear would arrive at the same time as the content.
 */

export function SkeletonLine({ width = "100%", tall = false }: { width?: string; tall?: boolean }) {
  return <span className={`skeleton${tall ? " skeleton--tall" : ""}`} style={{ width }} />;
}

export function SkeletonPageHead({ actions = 0 }: { actions?: number }) {
  return (
    <div className="page-head">
      <div className="skeleton-stack">
        <SkeletonLine width="14rem" tall />
        <SkeletonLine width="20rem" />
      </div>
      {actions > 0 && (
        <div className="actions-row">
          {Array.from({ length: actions }, (_, i) => (
            <SkeletonLine key={i} width="8rem" tall />
          ))}
        </div>
      )}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card">
      <div className="skeleton-stack">
        <SkeletonLine width="9rem" tall />
        {Array.from({ length: lines }, (_, i) => (
          <SkeletonLine key={i} width={i === lines - 1 ? "60%" : "100%"} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div className="stat" key={i}>
          <div className="skeleton-stack">
            <SkeletonLine width="3.5rem" tall />
            <SkeletonLine width="90%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card">
      <div className="skeleton-stack">
        <SkeletonLine width="9rem" tall />
        {Array.from({ length: rows }, (_, i) => (
          <div className="skeleton-row" key={i}>
            <SkeletonLine width="5rem" />
            <SkeletonLine width="100%" />
            <SkeletonLine width="4rem" />
          </div>
        ))}
      </div>
    </div>
  );
}
