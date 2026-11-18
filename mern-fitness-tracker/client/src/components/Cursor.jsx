import { useEffect, useRef, useState } from 'react';

// Small glowing ring only — no large glow orb behind the cursor (user rule,
// 2026-11-06). A short fading trail and a click ripple are the only extras.
// Disabled entirely when the user prefers reduced motion or on coarse
// pointers, where it would add nothing.
export default function Cursor() {
  const ringRef = useRef(null);
  const trailRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;
    setEnabled(true);
    let raf = 0;
    let x = -100;
    let y = -100;
    let tx = -100;
    let ty = -100;
    const onMove = (e) => {
      x = e.clientX;
      y = e.clientY;
    };
    const onDown = () => {
      const el = ringRef.current;
      if (el) el.classList.add('cursor-click');
      setTimeout(() => el && el.classList.remove('cursor-click'), 220);
    };
    const loop = () => {
      tx += (x - tx) * 0.35;
      ty += (y - ty) * 0.35;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${tx - 14}px, ${ty - 14}px)`;
      }
      if (trailRef.current) {
        trailRef.current.style.transform = `translate(${x - 3}px, ${y - 3}px)`;
      }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;
  return (
    <>
      <div ref={trailRef} className="cursor-trail" aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
    </>
  );
}
