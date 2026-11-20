import { useEffect, useRef, useState } from 'react';
import { CATEGORY_COLOURS } from '../data/content';
import { formatMoney } from '../api';

// Pure SVG donut chart for spend by category. Segments animate in when the
// chart scrolls into view; the legend always shows the figures as text.
export default function CategoryDonut({ data, currency }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  const entries = Array.isArray(data)
    ? data
    : Object.entries(data || {}).map(([category, total]) => ({ category, total }));
  const total = entries.reduce((s, e) => s + (Number(e.total) || 0), 0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (list) => {
        list.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!entries.length || total <= 0) {
    return <p className="muted">No expenses yet — the category chart appears once expenses are added.</p>;
  }

  const R = 70;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="donut-wrap" ref={ref}>
      <svg
        className="donut"
        viewBox="0 0 180 180"
        role="img"
        aria-label={`Spend by category, total ${formatMoney(total, currency)}`}
      >
        <circle cx="90" cy="90" r={R} fill="none" stroke="#eee7d8" strokeWidth="26" />
        {entries.map((e) => {
          const frac = (Number(e.total) || 0) / total;
          const dash = frac * C;
          const el = (
            <circle
              key={e.category}
              cx="90"
              cy="90"
              r={R}
              fill="none"
              stroke={CATEGORY_COLOURS[e.category] || '#2547f4'}
              strokeWidth="26"
              strokeDasharray={`${visible ? dash : 0} ${C}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 90 90)"
              style={{ transition: 'stroke-dasharray 0.9s ease' }}
            >
              <title>{`${e.category}: ${formatMoney(e.total, currency)}`}</title>
            </circle>
          );
          offset += dash;
          return el;
        })}
        <text x="90" y="86" textAnchor="middle" className="donut-total">
          {formatMoney(total, currency)}
        </text>
        <text x="90" y="108" textAnchor="middle" className="donut-caption">
          total spent
        </text>
      </svg>
      <ul className="donut-legend">
        {entries.map((e) => (
          <li key={e.category}>
            <span
              className="donut-swatch"
              style={{ background: CATEGORY_COLOURS[e.category] || '#2547f4' }}
              aria-hidden="true"
            />
            <span>{e.category}</span>
            <strong>{formatMoney(e.total, currency)}</strong>
            <span className="muted small">
              {Math.round(((Number(e.total) || 0) / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
