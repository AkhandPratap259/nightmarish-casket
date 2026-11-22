// SVG progress ring: current value against a target, with a centred label.
// Used for session volume (against the template's planned volume) and for
// challenge progress. Redesign: gooey SVG blobs (D10) orbit the ring and
// swell as the percentage fills, so the ring feels alive as volume grows.
const RING_GRADIENT_ID = 'pulsefit-ring-grad';

export default function VolumeRing({ value, target, label, size = 148 }) {
  const safeTarget = Math.max(1, Number(target) || 1);
  const pct = Math.min(1, (Number(value) || 0) / safeTarget);
  const r = 62;
  const c = 2 * Math.PI * r;
  const stroke = size === 148 ? 10 : 8;
  return (
    <div className="ring-wrap" role="img" aria-label={`${label}: ${Math.round(pct * 100)}%`}>
      <svg width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={RING_GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e85d8f" />
            <stop offset="55%" stopColor="#b98a1d" />
            <stop offset="100%" stopColor="#2f9e6e" />
          </linearGradient>
          <filter id="pulsefit-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
      <div className="ring-goo" style={{ '--fill': pct }} aria-hidden="true">
        <span className="goo-blob goo-blob--pink" />
        <span className="goo-blob goo-blob--butter" />
        <span className="goo-blob goo-blob--mint" />
        <span className="goo-blob goo-blob--sky" />
      </div>
      <svg width={size} height={size} viewBox="0 0 148 148" aria-hidden="true" className="ring-svg">
        <circle cx="74" cy="74" r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx="74"
          cy="74"
          r={r}
          fill="none"
          stroke={`url(#${RING_GRADIENT_ID})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform="rotate(-90 74 74)"
          className="ring-arc"
        />
      </svg>
      <div className="ring-centre">
        <strong>{Math.round(pct * 100)}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
