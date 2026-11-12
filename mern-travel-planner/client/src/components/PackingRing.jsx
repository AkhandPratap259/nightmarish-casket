// Animated SVG progress ring for the packing checklist.
// The ring animates via a CSS transition on stroke-dashoffset; with
// reduced motion the transition is disabled and the final value shows.
export default function PackingRing({ done, total, size = 120 }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="packing-ring" role="img" aria-label={`Packing ${done} of ${total} items packed — ${pct} percent`}>
      <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={r} className="ring-track" />
        <circle
          cx="60"
          cy="60"
          r={r}
          className="ring-fill"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring-centre">
        <span className="ring-pct">{pct}%</span>
        <span className="ring-label">
          {done} / {total} packed
        </span>
      </div>
    </div>
  );
}
