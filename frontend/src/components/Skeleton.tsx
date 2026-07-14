/** Shimmer placeholder rows while lists load. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-list" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-circle skeleton-shimmer" />
          <div className="skeleton-lines">
            <div
              className="skeleton-bar skeleton-shimmer"
              style={{ width: `${70 - i * 8}%` }}
            />
            <div
              className="skeleton-bar skeleton-shimmer short"
              style={{ width: `${48 - i * 4}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
