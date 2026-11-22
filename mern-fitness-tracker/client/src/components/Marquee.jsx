import { useEffect, useRef } from 'react';

// Scroll-velocity marquee (D12). A pill strip whose scroll speed grows with
// the page's scroll velocity, so it feels tied to how fast the reader moves.
// Content is duplicated once for a seamless loop. With reduced motion it
// renders as a static wrapped row; with JS animations disabled the items
// are still all readable in the document flow.
export default function Marquee({ items, label = 'Highlights' }) {
  const trackRef = useRef(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const track = trackRef.current;
    if (!track || reduced) return;
    const st = { x: 0, vel: 0, lastY: window.scrollY, lastT: performance.now(), raf: 0 };
    const tick = (t) => {
      const dt = Math.min(50, Math.max(1, t - st.lastT));
      st.lastT = t;
      const y = window.scrollY;
      const dv = (y - st.lastY) / dt;
      st.lastY = y;
      st.vel += (dv - st.vel) * 0.08;
      const step = (0.55 + Math.min(6, Math.abs(st.vel) * 14)) * (dt / 16.7);
      st.x += step;
      const half = track.scrollWidth / 2;
      if (half > 0) st.x %= half;
      track.style.transform = `translate3d(${-st.x}px, 0, 0)`;
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(st.raf);
  }, []);

  const row = (keyPrefix) =>
    items.map((item, i) => (
      <span key={`${keyPrefix}-${i}`} className="marquee-item">
        {item}
        <span className="marquee-star" aria-hidden="true">
          ✦
        </span>
      </span>
    ));

  return (
    <div className="marquee" aria-label={label}>
      <div className="marquee-track" ref={trackRef}>
        {row('a')}
        {row('b')}
      </div>
    </div>
  );
}
