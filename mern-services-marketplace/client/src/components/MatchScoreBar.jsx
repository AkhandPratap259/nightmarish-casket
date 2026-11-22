import { useEffect, useRef, useState } from 'react';

// Animated match-score bar — a torn-paper strip with segment ticks for
// the five formula parts. The fill springs to the live score (or sets
// instantly when reduced motion is preferred) and the breakdown shows a
// mini bar per part, all from the real match data.
const PART_MAX = { rating: 30, completedJobs: 20, responseRate: 20, price: 20, area: 10 };
const PART_LABELS = [
  ['rating', 'Rating'],
  ['completedJobs', 'Completed jobs'],
  ['responseRate', 'Response rate'],
  ['price', 'Price vs median'],
  ['area', 'Serves your area'],
];
export default function MatchScoreBar({ score, parts, compact = false }) {
  const [width, setWidth] = useState(0);
  const [open, setOpen] = useState(false);
  const barRef = useRef(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setWidth(score);
      return undefined;
    }
    const raf = requestAnimationFrame(() => setWidth(score));
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div className={`match-score ${compact ? 'match-score--compact' : ''}`}>
      <div className="match-score-top">
        <span className="match-score-label">Match score</span>
        <span className="match-score-value" aria-label={`Match score ${score} out of 100`}>
          {score}
          <span className="match-score-max">/100</span>
        </span>
      </div>
      <div
        className="match-bar"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Match score"
      >
        <div ref={barRef} className="match-bar-fill" style={{ width: `${width}%` }} />
      </div>
      {parts && (
        <button
          type="button"
          className="match-why"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Hide why this score' : 'Why this score?'}
        </button>
      )}
      {parts && open && (
        <ul className="match-parts">
          {PART_LABELS.map(([key, label]) => {
            const value = parts[key] ?? 0;
            const max = PART_MAX[key];
            return (
              <li key={key}>
                <span>{label}</span>
                <strong>{value} / {max}</strong>
                <span className="part-bar" aria-hidden="true">
                  <i style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
