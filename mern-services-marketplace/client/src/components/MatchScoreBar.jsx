import { useEffect, useRef, useState } from 'react';

// Animated match-score bar. The bar fills on mount (or instantly when
// reduced motion is preferred) and the parts break down on hover/focus.
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
          <li><span>Rating</span><strong>{parts.rating} / 30</strong></li>
          <li><span>Completed jobs</span><strong>{parts.completedJobs} / 20</strong></li>
          <li><span>Response rate</span><strong>{parts.responseRate} / 20</strong></li>
          <li><span>Price vs median</span><strong>{parts.price} / 20</strong></li>
          <li><span>Serves your area</span><strong>{parts.area} / 10</strong></li>
        </ul>
      )}
    </div>
  );
}
