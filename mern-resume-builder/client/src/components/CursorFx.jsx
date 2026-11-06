import { useEffect, useRef } from 'react';

// Cursor effect: SMALL glowing ring only — no large glow orb behind the
// cursor (user rule, 2026-11-06). Fading trail of dots, a spotlight inside
// the card under the cursor, and a small ripple where you click.
// Disabled for touch devices and reduced motion.
export default function CursorFx() {
  const ringRef = useRef(null);
  const trailRefs = useRef([]);
  const rippleLayerRef = useRef(null);

  useEffect(() => {
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.matchMedia('(pointer: coarse)').matches
    ) {
      return;
    }
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let rx = tx;
    let ry = ty;
    const trail = Array.from({ length: 6 }, () => ({ x: tx, y: ty }));
    let raf;

    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      const card = e.target.closest?.('.panel, .resume-row, .form-section, .ats-panel, .resume-page');
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      }
      const hot = e.target.closest?.('button, a, input, select, textarea');
      ringRef.current?.classList.toggle('is-active', !!hot);
    };

    const onDown = (e) => {
      const layer = rippleLayerRef.current;
      if (!layer) return;
      const el = document.createElement('span');
      el.className = 'cursor-ripple';
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      layer.appendChild(el);
      setTimeout(() => el.remove(), 700);
    };

    const loop = () => {
      rx += (tx - rx) * 0.3;
      ry += (ty - ry) * 0.3;
      if (ringRef.current) ringRef.current.style.transform = `translate(${rx}px, ${ry}px)`;
      trail.forEach((dot, i) => {
        const target = i === 0 ? { x: tx, y: ty } : trail[i - 1];
        dot.x += (target.x - dot.x) * 0.22;
        dot.y += (target.y - dot.y) * 0.22;
        const el = trailRefs.current[i];
        if (el) el.style.transform = `translate(${dot.x}px, ${dot.y}px)`;
      });
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={rippleLayerRef} className="cursor-ripple-layer" aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
      {Array.from({ length: 6 }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
          className="cursor-trail"
          style={{ opacity: 0.55 - i * 0.08 }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
