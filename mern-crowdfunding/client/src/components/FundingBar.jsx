import { useEffect, useState } from 'react';
import { formatINR } from '../data/config';

// Animated funding progress bar. The fill width animates on mount and on
// every update; a curtain overlay reveals it (never a clip-path collapse).
// Stretch-goal markers are positioned by amount / goal.
export default function FundingBar({ pledged = 0, goal = 1, stretchGoals = [], showLabels = true }) {
  const safeGoal = Math.max(1, Number(goal) || 1);
  const percent = Math.min(100, Math.round(((Number(pledged) || 0) / safeGoal) * 100));
  const funded = (Number(pledged) || 0) >= safeGoal;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setWidth(percent), 60);
    return () => window.clearTimeout(t);
  }, [percent]);

  const markers = (stretchGoals || [])
    .filter((g) => g && Number(g.amount) > 0)
    .map((g) => ({ ...g, pct: Math.min(100, (Number(g.amount) / safeGoal) * 100) }));

  return (
    <div className="funding-bar-wrap">
      <div
        className={`funding-bar${funded ? ' is-funded' : ''}`}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${percent}% funded`}
      >
        <div className="funding-fill" style={{ width: `${width}%` }} />
        <div className="funding-curtain" style={{ transform: `translateX(${width}%)` }} aria-hidden="true" />
        {markers.map((m, i) => (
          <span
            key={m.title ? `${m.title}-${i}` : i}
            className={`stretch-marker${(Number(pledged) || 0) >= Number(m.amount) ? ' is-reached' : ''}`}
            style={{ left: `${m.pct}%` }}
            title={`${m.title || 'Stretch goal'} — ${formatINR(m.amount)}`}
            aria-hidden="true"
          />
        ))}
      </div>
      {showLabels ? (
        <div className="funding-labels">
          <span className="funding-percent">{percent}% funded</span>
          {markers.length ? (
            <span className="funding-stretch">
              {markers.filter((m) => (Number(pledged) || 0) >= Number(m.amount)).length} of {markers.length} stretch{' '}
              {markers.length === 1 ? 'goal' : 'goals'} reached
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
