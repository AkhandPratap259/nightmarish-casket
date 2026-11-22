import { useEffect, useRef, useState } from 'react';

// Cursor spotlight / lens reveal (D2): a soft chrome sheen follows the
// pointer, a ring marks its exact spot, and every .spot-card picks the
// sheen up through --mx/--my on the root. Fading trail dots and click
// ripples remain. Skipped entirely on touch devices and under
// prefers-reduced-motion — on touch, tap feedback replaces pointer effects.
export default function Cursor() {
  const ringRef = useRef(null);
  const spotRef = useRef(null);
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
    const root = document.documentElement;
    const onMove = (e) => {
      x = e.clientX;
      y = e.clientY;
      root.style.setProperty('--mx', `${x}px`);
      root.style.setProperty('--my', `${y}px`);
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
      window.setTimeout(() => setRipples((r) => r.filter((p) => p.id !== id)), 700);
    };
    const onUp = () => {
      down = false;
    };
    const loop = () => {
      rx += (x - rx) * 0.3;
      ry += (y - ry) * 0.3;
      if (ringRef.current) {
        ringRef.current.style.left = `${rx}px`;
        ringRef.current.style.top = `${ry}px`;
        ringRef.current.classList.toggle('is-down', down);
      }
      if (spotRef.current) {
        spotRef.current.style.left = `${rx}px`;
        spotRef.current.style.top = `${ry}px`;
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
      <div ref={spotRef} className="cursor-spotlight" aria-hidden="true" />
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
