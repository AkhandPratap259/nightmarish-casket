import { useEffect, useRef } from 'react';

// D9 multi-layer parallax (FundForge): chrome bubbles and twinkling stars
// drift at different depths behind the auth hero, following the pointer.
// Fine pointers only; still when motion is off or reduced motion is preferred.
const BUBBLES = [
  { size: 180, left: '4%', top: '10%', depth: 18 },
  { size: 120, left: '60%', top: '4%', depth: 30 },
  { size: 90, left: '76%', top: '56%', depth: 42 },
  { size: 60, left: '28%', top: '70%', depth: 24 },
  { size: 140, left: '42%', top: '28%', depth: 12 },
];
const STARS = [
  { left: '12%', top: '22%', depth: 34 },
  { left: '68%', top: '28%', depth: 48 },
  { left: '50%', top: '76%', depth: 26 },
  { left: '86%', top: '14%', depth: 40 },
];

export default function Parallax({ motion }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!motion || !el || !matchMedia('(pointer:fine)').matches) return;
    const parent = el.parentElement;
    if (!parent) return;
    let frame = 0;
    const move = (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = parent.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.querySelectorAll('[data-depth]').forEach((n) => {
          const d = Number(n.dataset.depth);
          n.style.transform = `translate(${(-x * d).toFixed(1)}px, ${(-y * d).toFixed(1)}px)`;
        });
      });
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      el.querySelectorAll('[data-depth]').forEach((n) => { n.style.transform = ''; });
    };
    parent.addEventListener('pointermove', move, { passive: true });
    parent.addEventListener('pointerleave', reset);
    return () => {
      cancelAnimationFrame(frame);
      parent.removeEventListener('pointermove', move);
      parent.removeEventListener('pointerleave', reset);
    };
  }, [motion]);

  return (
    <div className="hero-bubbles" ref={ref} aria-hidden="true">
      {BUBBLES.map((b, i) => (
        <span key={i} className="hero-bubble" data-depth={b.depth} style={{ width: b.size, height: b.size, left: b.left, top: b.top }} />
      ))}
      {STARS.map((s, i) => (
        <span key={i} className="hero-star" data-depth={s.depth} style={{ left: s.left, top: s.top }}>✦</span>
      ))}
    </div>
  );
}
