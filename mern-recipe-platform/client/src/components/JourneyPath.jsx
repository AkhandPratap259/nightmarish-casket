import { useEffect, useRef, useState } from 'react';

// D13 — Scroll-scrubbed SVG path drawing (secondary interaction).
// A winding "cooking journey" path draws itself as the section scrolls
// through the viewport, with a leaf dot travelling along it. With reduced
// motion (or no IntersectionObserver) the path renders fully drawn.
export default function JourneyPath({ steps }) {
  const wrapRef = useRef(null);
  const pathRef = useRef(null);
  const dotRef = useRef(null);
  const [length, setLength] = useState(0);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return undefined;
    const len = path.getTotalLength();
    setLength(len);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let raf = 0;
    const update = () => {
      const el = wrapRef.current;
      if (!el || !pathRef.current || !dotRef.current) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height + vh;
      const done = vh - rect.top;
      const p = Math.min(1, Math.max(0, done / total));
      const drawLen = len * p;
      pathRef.current.style.strokeDashoffset = String(len - drawLen);
      const point = pathRef.current.getPointAtLength(drawLen);
      dotRef.current.setAttribute('cx', point.x);
      dotRef.current.setAttribute('cy', point.y);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [length]);

  const reduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dash = reduced ? { strokeDasharray: 'none', strokeDashoffset: 0 } : { strokeDasharray: length, strokeDashoffset: length };

  return (
    <div ref={wrapRef} className="journey" aria-hidden="true">
      <svg className="journey-svg" viewBox="0 0 900 260" preserveAspectRatio="xMidYMid meet">
        <path className="journey-path-bg" d="M40 210 C 180 40, 320 240, 450 130 S 720 60, 860 150" />
        <path ref={pathRef} className="journey-path-fg" style={dash} d="M40 210 C 180 40, 320 240, 450 130 S 720 60, 860 150" />
        <circle ref={dotRef} className="journey-dot" r="11" cx="40" cy="210" />
        {steps.map((s, i) => {
          const x = [110, 450, 780][i] || 450;
          const y = [52, 210, 92][i] || 120;
          return (
            <g key={s.num}>
              <text className="journey-label" x={x} y={y} textAnchor="middle">{s.num} · {s.title}</text>
              <text className="journey-sub" x={x} y={y + 20} textAnchor="middle">
                {s.text.length > 42 ? `${s.text.slice(0, 42)}…` : s.text}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
