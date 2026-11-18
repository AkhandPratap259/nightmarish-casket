// SVG progress ring: current value against a target, with a centred label.
// Used for session volume (against the template's planned volume) and for
// challenge progress.
export default function VolumeRing({ value, target, label, size = 148 }) {
  const safeTarget = Math.max(1, Number(target) || 1);
  const pct = Math.min(1, (Number(value) || 0) / safeTarget);
  const r = 62;
  const c = 2 * Math.PI * r;
  const stroke = size === 148 ? 10 : 8;
  return (
    <div className="ring-wrap" role="img" aria-label={`${label}: ${Math.round(pct * 100)}%`}>
      <svg width={size} height={size} viewBox="0 0 148 148" aria-hidden="true">
        <circle cx="74" cy="74" r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx="74"
          cy="74"
          r={r}
          fill="none"
          stroke="var(--accent)"
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
