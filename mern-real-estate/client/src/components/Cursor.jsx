import { useEffect, useRef, useState } from 'react';

// D1 Magnetic buttons + magnetic cursor. A blueprint crosshair follows the
// pointer with a slow cinematic lag (F2); buttons and chips within reach are
// pulled gently toward it and spring back on leave. Touch and reduced-motion
// users get no cursor at all — tap feedback comes from :active instead.
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
    let magnet = null;

    const onMove = (e) => {
      x = e.clientX;
      y = e.clientY;
      const now = performance.now();
      if (now - lastTrail.current > 110) {
        lastTrail.current = now;
        const id = now;
        setTrails((t) => [...t.slice(-5), { id, x, y }]);
        window.setTimeout(() => setTrails((t) => t.filter((p) => p.id !== id)), 950);
      }
      // Magnetic pull: the nearest button/chip within 90px leans toward the pointer.
      const target = e.target.closest ? e.target.closest('.btn, .chip, .nav-link, .brand') : null;
      if (magnet && magnet !== target) {
        magnet.style.transform = '';
        magnet = null;
      }
      if (target) {
        magnet = target;
        const r = target.getBoundingClientRect();
        const dx = (x - (r.left + r.width / 2)) * 0.18;
        const dy = (y - (r.top + r.height / 2)) * 0.28;
        target.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
        if (ringRef.current) ringRef.current.classList.add('is-hover-btn');
      } else if (ringRef.current) {
        ringRef.current.classList.remove('is-hover-btn');
      }
    };
    const onDown = (e) => {
      down = true;
      const id = performance.now();
      setRipples((r) => [...r, { id, x: e.clientX, y: e.clientY }]);
      window.setTimeout(() => setRipples((r) => r.filter((p) => p.id !== id)), 950);
    };
    const onUp = () => { down = false; };
    const loop = () => {
      // Slow cinematic follow — a deliberately lazy lerp, not a snap.
      rx += (x - rx) * 0.12;
      ry += (y - ry) * 0.12;
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
      if (magnet) magnet.style.transform = '';
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true"><span className="cursor-dot" /></div>
      {trails.map((t) => (
        <span key={t.id} className="cursor-trail" style={{ left: t.x, top: t.y }} aria-hidden="true" />
      ))}
      {ripples.map((r) => (
        <span key={r.id} className="cursor-ripple" style={{ left: r.x, top: r.y }} aria-hidden="true" />
      ))}
    </>
  );
}
