import { useEffect, useState } from 'react';

function partsLeft(endsAt) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (!endsAt || Number.isNaN(ms) || ms <= 0) return null;
  const totalSecs = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSecs / 86400),
    hours: Math.floor((totalSecs % 86400) / 3600),
    mins: Math.floor((totalSecs % 3600) / 60),
    secs: totalSecs % 60,
    totalMs: ms,
  };
}

// SVG ring showing time remaining to endsAt. Ticks every second; when the
// deadline passes it renders an "Ended" state instead of a ring.
export default function CountdownRing({ endsAt, size = 148 }) {
  const [left, setLeft] = useState(() => partsLeft(endsAt));

  useEffect(() => {
    setLeft(partsLeft(endsAt));
    const t = window.setInterval(() => setLeft(partsLeft(endsAt)), 1000);
    return () => window.clearInterval(t);
  }, [endsAt]);

  if (!left) {
    return (
      <div className="countdown-ring ended" style={{ width: size, height: size }} role="timer" aria-label="Campaign ended">
        <span className="countdown-ended">Ended</span>
      </div>
    );
  }

  const radius = 62;
  const circ = 2 * Math.PI * radius;
  // Ring fraction: how much of the final day remains (days dominate the label).
  const dayFraction = left.days > 0 ? 1 : (left.hours * 3600 + left.mins * 60 + left.secs) / 86400;
  const offset = circ * (1 - dayFraction);

  return (
    <div className="countdown-ring" style={{ width: size, height: size }} role="timer" aria-label={`${left.days} days, ${left.hours} hours, ${left.mins} minutes left`}>
      <svg width={size} height={size} viewBox="0 0 148 148" aria-hidden="true">
        <defs>
          <linearGradient id="chrome-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff5ea8" />
            <stop offset="55%" stopColor="#c40e6e" />
            <stop offset="100%" stopColor="#5b4bc4" />
          </linearGradient>
        </defs>
        <circle cx="74" cy="74" r={radius} fill="none" stroke="#e3def2" strokeWidth="8" />
        <circle
          cx="74"
          cy="74"
          r={radius}
          fill="none"
          stroke="url(#chrome-ring)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 74 74)"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="countdown-centre">
        <span className="countdown-number">{left.days}</span>
        <span className="countdown-unit">{left.days === 1 ? 'day' : 'days'} left</span>
        <span className="countdown-sub">
          {String(left.hours).padStart(2, '0')}:{String(left.mins).padStart(2, '0')}:
          {String(left.secs).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
