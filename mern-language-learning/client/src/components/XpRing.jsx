// SVG progress ring: today's XP against the daily goal, or level progress.
// The stroke animates when the value changes.
export default function XpRing({ value, max, size = 120, label, sublabel }) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.max(0, Math.min(1, value / max));
  return (
    <div className="xp-ring" role="img" aria-label={`${label}: ${value} of ${max}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id="xpRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff2e88" />
            <stop offset="55%" stopColor="#ff7a18" />
            <stop offset="100%" stopColor="#22e6ff" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} className="xp-ring-track" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="xp-ring-fill"
          stroke="url(#xpRingGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="xp-ring-text">
        <span className="xp-ring-value">{value}</span>
        <span className="xp-ring-label">{label}</span>
        {sublabel ? <span className="xp-ring-sub">{sublabel}</span> : null}
      </div>
    </div>
  );
}
