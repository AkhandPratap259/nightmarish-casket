import { useEffect, useRef, useState } from 'react';

// Small glowing ring only — no large glow orb behind the cursor.
// Subtle replacements: a fading trail dot and click ripples.
export default function Cursor() {
  const ringRef = useRef(null);
  const [trails, setTrails] = useState([]);
  const [ripples, setRipples] = useState([]);
  const lastTrail = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let raf = 0;
    let x = -100;
    let y = -100;
    let rx = -100;
    let ry = -100;
    let down = false;
    const onMove = (e) => {
      x = e.clientX;
      y = e.clientY;
      const now = performance.now();
      if (now - lastTrail.current > 90) {
        lastTrail.current = now;
        const id = now;
        setTrails((t) => [...t.slice(-6), { id, x, y }]);
        window.setTimeout(() => setTrails((t) => t.filter((p) => p.id !== id)), 520);
      }
    };
    const onDown = (e) => {
      down = true;
      const id = performance.now();
      setRipples((r) => [...r, { id, x: e.clientX, y: e.clientY }]);
      window.setTimeout(() => setRipples((r) => r.filter((p) => p.id !== id)), 480);
    };
    const onUp = () => {
      down = false;
    };
    const loop = () => {
      rx += (x - rx) * 0.35;
      ry += (y - ry) * 0.35;
      if (ringRef.current) {
        ringRef.current.style.left = `${rx}px`;
        ringRef.current.style.top = `${ry}px`;
        ringRef.current.classList.toggle('is-down', down);
      }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown, { passive: true });
    window.addEventListener('mouseup', onUp, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
      {trails.map((t) => (
        <span key={t.id} className="cursor-trail" style={{ left: t.x, top: t.y }} aria-hidden="true" />
      ))}
      {ripples.map((r) => (
        <span key={r.id} className="cursor-ripple" style={{ left: r.x, top: r.y }} aria-hidden="true" />
      ))}
    </>
  );
}
