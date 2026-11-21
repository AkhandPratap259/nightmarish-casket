import { useEffect, useRef } from 'react';

// Small glowing cursor ring only — no large glow orb behind the cursor.
// A short fading trail and click ripples are the only extras.
export default function Cursor() {
  const ringRef = useRef(null);
  const trailRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (window.matchMedia('(pointer: coarse)').matches) return undefined;
    const ring = ringRef.current;
    const trail = trailRef.current;
    if (!ring || !trail) return undefined;

    let x = -100;
    let y = -100;
    let tx = -100;
    let ty = -100;
    let raf = 0;
    let last = 0;

    const move = (e) => {
      x = e.clientX;
      y = e.clientY;
      ring.style.opacity = '1';
      ring.style.transform = `translate(${x - 14}px, ${y - 14}px)`;
    };
    const tick = (t) => {
      if (t - last > 16) {
        tx += (x - tx) * 0.35;
        ty += (y - ty) * 0.35;
        trail.style.transform = `translate(${tx - 5}px, ${ty - 5}px)`;
        trail.style.opacity = x < 0 ? '0' : '0.5';
        last = t;
      }
      raf = requestAnimationFrame(tick);
    };
    const click = (e) => {
      const ripple = document.createElement('span');
      ripple.className = 'cursor-ripple';
      ripple.style.left = `${e.clientX - 18}px`;
      ripple.style.top = `${e.clientY - 18}px`;
      document.body.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 650);
    };

    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('click', click, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('click', click);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" style={{ transform: 'translate(-100px, -100px)', opacity: 0 }} />
      <div ref={trailRef} className="cursor-trail" aria-hidden="true" />
    </>
  );
}
