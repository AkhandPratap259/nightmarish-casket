import { useId } from 'react';
import { formatMoney } from '../api';

// Data-driven settlement diagram drawn from the group's REAL simplified
// settlement plan: payers on the left, payees on the right, one curved
// phosphor-amber wire per transfer, amounts in terminal monospace.
// Edges draw themselves (dash animation) whenever the plan changes.
export default function SettlementDiagram({ plan, currency }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const rows = Array.isArray(plan) ? plan : [];
  if (!rows.length) return null;

  const fromNames = [];
  const toNames = [];
  rows.forEach((s) => {
    const f = s.fromName || s.from || 'Someone';
    const t = s.toName || s.to || 'Someone';
    if (!fromNames.includes(f)) fromNames.push(f);
    if (!toNames.includes(t)) toNames.push(t);
  });

  const W = 560;
  const H = Math.max(200, Math.max(fromNames.length, toNames.length) * 64 + 56);
  const leftX = 118;
  const rightX = W - 118;
  const top = 34;
  const span = Math.max(1, Math.max(fromNames.length, toNames.length) - 1);
  const yFor = (i, n) => (n === 1 ? H / 2 : top + (i / span) * (H - top * 2));
  const short = (name) => (name.length > 12 ? `${name.slice(0, 11)}…` : name);

  return (
    <div className="settlement-diagram" role="img" aria-label={`Settlement diagram: ${rows.length} transfer${rows.length === 1 ? '' : 's'} settle the group`}>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <marker id={`arrow-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ffb000" />
          </marker>
          <pattern id={`dots-${uid}`} width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill="rgba(255,176,0,0.22)" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill={`url(#dots-${uid})`} />
        {rows.map((s, i) => {
          const from = s.fromName || s.from || 'Someone';
          const to = s.toName || s.to || 'Someone';
          const y1 = yFor(fromNames.indexOf(from), fromNames.length);
          const y2 = yFor(toNames.indexOf(to), toNames.length);
          const midX = (leftX + rightX) / 2;
          const midY = (y1 + y2) / 2;
          return (
            <path
              key={`${from}-${to}-${i}`}
              d={`M ${leftX + 44} ${y1} C ${leftX + 150} ${y1}, ${rightX - 150} ${y2}, ${rightX - 48} ${y2}`}
              fill="none"
              stroke="#ffb000"
              strokeWidth="2"
              strokeDasharray="1"
              pathLength="1"
              markerEnd={`url(#arrow-${uid})`}
              style={{
                strokeDashoffset: 0,
                animation: `settle-wire ${1.15}s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.35}s both`,
              }}
            >
              <title>{`${from} pays ${to} ${formatMoney(s.amount ?? s.value ?? 0, currency)}`}</title>
            </path>
          );
        })}
        {rows.map((s, i) => {
          const from = s.fromName || s.from || 'Someone';
          const to = s.toName || s.to || 'Someone';
          const y1 = yFor(fromNames.indexOf(from), fromNames.length);
          const y2 = yFor(toNames.indexOf(to), toNames.length);
          const midX = (leftX + rightX) / 2;
          const midY = (y1 + y2) / 2;
          return (
            <text
              key={`amt-${i}`}
              x={midX}
              y={midY - 8}
              textAnchor="middle"
              fill="#ffb000"
              fontSize="13"
              fontFamily="'IBM Plex Mono', monospace"
              fontWeight="600"
              style={{ animation: `settle-fade 0.75s ease ${0.5 + i * 0.35}s both` }}
            >
              {formatMoney(s.amount ?? s.value ?? 0, currency)}
            </text>
          );
        })}
        {fromNames.map((name, i) => (
          <g key={`from-${name}`}>
            <rect x="8" y={yFor(i, fromNames.length) - 15} width="104" height="30" fill="#f2ecdc" stroke="#17130c" strokeWidth="2" />
            <text x="60" y={yFor(i, fromNames.length) + 5} textAnchor="middle" fill="#17130c" fontSize="13" fontFamily="'IBM Plex Mono', monospace" fontWeight="600">
              {short(name)}
            </text>
          </g>
        ))}
        {toNames.map((name, i) => (
          <g key={`to-${name}`}>
            <rect x={W - 112} y={yFor(i, toNames.length) - 15} width="104" height="30" fill="#c8102e" stroke="#17130c" strokeWidth="2" />
            <text x={W - 60} y={yFor(i, toNames.length) + 5} textAnchor="middle" fill="#ffffff" fontSize="13" fontFamily="'IBM Plex Mono', monospace" fontWeight="600">
              {short(name)}
            </text>
          </g>
        ))}
        <text x="60" y="18" textAnchor="middle" fill="#8a7f68" fontSize="11" fontFamily="'IBM Plex Mono', monospace" letterSpacing="2">PAYS</text>
        <text x={W - 60} y="18" textAnchor="middle" fill="#8a7f68" fontSize="11" fontFamily="'IBM Plex Mono', monospace" letterSpacing="2">RECEIVES</text>
      </svg>
      <style>{`
        @keyframes settle-wire { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes settle-fade { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .settlement-diagram path, .settlement-diagram text { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
