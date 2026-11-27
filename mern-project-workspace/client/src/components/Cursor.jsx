import { useEffect, useRef, useState } from 'react';

// D2 cursor spotlight / lens reveal (FundForge): a soft chrome sheen follows
// the pointer, a ring marks its exact spot, and every .spot-card picks the
// sheen up through --cx/--cy on the root. (Named --cx/--cy, not --mx/--my:
// --mx/--my are the per-element magnetic offsets used by .magnetic and
// .card tilt — sharing the name made buttons translate by the full cursor
// position. See 2026-11-27 fix.) TaskTrove paper-chip trail: torn-paper
// chips (glyph + board column label) spawn behind the cursor as it moves,
// pop in, drift up and fade. Skipped entirely on touch devices, under
// prefers-reduced-motion, and when the motion toggle is off.
const TRAIL_ITEMS = [
  { glyph: '○', label: 'To Do' },
  { glyph: '◐', label: 'In Progress' },
  { glyph: '◍', label: 'Review' },
  { glyph: '●', label: 'Done' },
];
const MAX_CHIPS = 12;

export default function Cursor({ motion }) {
  const ringRef = useRef(null);
  const spotRef = useRef(null);
  const [trails, setTrails] = useState([]);
  const [ripples, setRipples] = useState([]);
  const lastSpawn = useRef(0);
  const lastSpawnPos = useRef({ x: -1000, y: -1000 });
  const itemRef = useRef(0);

  useEffect(() => {
    if (!motion) return undefined;
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
      root.style.setProperty('--cx', `${x}px`);
      root.style.setProperty('--cy', `${y}px`);
      const now = performance.now();
      const dist = Math.hypot(x - lastSpawnPos.current.x, y - lastSpawnPos.current.y);
      if (now - lastSpawn.current > 95 && dist > 30) {
        lastSpawn.current = now;
        lastSpawnPos.current = { x, y };
        const item = TRAIL_ITEMS[itemRef.current % TRAIL_ITEMS.length];
        itemRef.current += 1;
        const id = now;
        const rot = (Math.random() * 14 - 7).toFixed(1);
        setTrails((t) => [...t.slice(-(MAX_CHIPS - 1)), { id, x, y, rot, glyph: item.glyph, label: item.label }]);
      }
    };
    const onDown = (e) => {
      down = true;
      const id = performance.now();
      setRipples((r) => [...r, { id, x: e.clientX, y: e.clientY }]);
      window.setTimeout(() => setRipples((r) => r.filter((p) => p.id !== id)), 700);
    };
    const onUp = () => { down = false; };
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
  }, [motion]);

  if (!motion) return null;
  return (
    <>
      <div ref={spotRef} className="cursor-spotlight" aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
      {trails.map((t) => (
        <span key={t.id} className="trail-chip" aria-hidden="true" style={{ left: t.x, top: t.y, '--rot': `${t.rot}deg` }} onAnimationEnd={() => setTrails((prev) => prev.filter((p) => p.id !== t.id))}>
          <span className="trail-glyph" aria-hidden="true">{t.glyph}</span>
          {t.label}
        </span>
      ))}
      {ripples.map((r) => (
        <span key={r.id} className="cursor-ripple" style={{ left: r.x, top: r.y }} aria-hidden="true" />
      ))}
    </>
  );
}
