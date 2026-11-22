import { useMemo } from 'react';
import { inr, timeAgo } from '../api';

const W = 640;
const H = 240;
const PAD = { l: 64, r: 16, t: 18, b: 30 };

/**
 * Price chart — the data-driven visual. Plots the lot's real bids as a
 * line in overprinted riso red and blue, with the starting bid as a
 * dashed baseline. The line re-draws with a bounce every time a new bid
 * arrives (keyed on the bid count), and the latest bid's dot pulses.
 * Bids arrive newest-first from the API, so they are reversed into
 * chronological order here. No invented data: with no bids yet, only the
 * opening-bid baseline is drawn.
 */
export default function PriceChart({ bids, startingBid, createdAt, currentBid }) {
  const points = useMemo(() => {
    const chrono = [...(bids || [])].reverse();
    const pts = chrono.map((b) => ({ t: new Date(b.createdAt).getTime(), amount: Number(b.amount) }));
    const start = Number(startingBid) || 0;
    if (pts.length === 0) return [];
    // Anchor the climb at the opening bid, placed at the lot's listing time.
    const anchorT = createdAt ? new Date(createdAt).getTime() : pts[0].t;
    if (pts[0].amount > start) pts.unshift({ t: anchorT, amount: start });
    return pts;
  }, [bids, startingBid, createdAt]);

  if (points.length < 2) {
    return (
      <div className="price-chart" role="img" aria-label={`Price chart: no bids yet. The opening bid is ${inr(startingBid)}.`}>
        <h3>Price climb</h3>
        <p className="price-chart-note">
          No bids yet — the opening bid is {inr(startingBid)}. The climb draws itself here as bids land.
        </p>
        <svg className="price-chart-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} className="chart-baseline" />
          <text x={PAD.l} y={H - PAD.b - 10} className="chart-axis">Opening bid {inr(startingBid)}</text>
        </svg>
      </div>
    );
  }

  const amounts = points.map((p) => p.amount);
  const yMin = Math.min(...amounts, Number(startingBid) || 0);
  const yMax = Math.max(...amounts, Number(currentBid) || 0);
  const yPad = Math.max(1, (yMax - yMin) * 0.08);
  const lo = yMin - yPad;
  const hi = yMax + yPad;
  const times = points.map((p) => p.t);
  const tMin = Math.min(...times);
  const tMax = Math.max(...times, Date.now());
  const tSpan = Math.max(1, tMax - tMin);

  const x = (t) => PAD.l + ((t - tMin) / tSpan) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.amount).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points[points.length - 1].t).toFixed(1)},${H - PAD.b} L${x(points[0].t).toFixed(1)},${H - PAD.b} Z`;
  const last = points[points.length - 1];
  const first = points[0];

  return (
    <div
      className="price-chart"
      role="img"
      aria-label={`Price chart: ${points.length} bids, climbing from ${inr(first.amount)} to ${inr(last.amount)}.`}
    >
      <h3>Price climb</h3>
      <p className="price-chart-note">
        {points.length} bid{points.length === 1 ? '' : 's'} so far — from {inr(first.amount)} to {inr(last.amount)}.
        The line redraws live as new bids land.
      </p>
      <svg className="price-chart-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD.l}
            y1={PAD.t + f * (H - PAD.t - PAD.b)}
            x2={W - PAD.r}
            y2={PAD.t + f * (H - PAD.t - PAD.b)}
            className="chart-grid"
          />
        ))}
        <path d={area} className="chart-area" />
        {/* Overprint: the blue line sits 3px off the red line, like a
            misregistered second pass through the riso printer. */}
        <path key={`blue-${points.length}`} d={line} className="chart-line-blue" pathLength={1} transform="translate(3, 3)" />
        <path key={`red-${points.length}`} d={line} className="chart-line-red" pathLength={1} />
        {points.map((p, i) => (
          <circle
            key={`${p.t}-${p.amount}-${i}`}
            cx={x(p.t)}
            cy={y(p.amount)}
            r={i === points.length - 1 ? 7 : 5}
            className={i === points.length - 1 ? 'chart-dot chart-dot--latest' : 'chart-dot'}
            style={{ animationDelay: `${i * 0.07}s`, transformOrigin: `${x(p.t)}px ${y(p.amount)}px` }}
          />
        ))}
        <text x={PAD.l} y={PAD.t - 4} className="chart-axis">{inr(hi)}</text>
        <text x={PAD.l} y={H - 8} className="chart-axis">{inr(lo)}</text>
        <text x={W - PAD.r} y={H - 8} className="chart-axis" textAnchor="end">
          {timeAgo(last.t)}
        </text>
      </svg>
    </div>
  );
}
