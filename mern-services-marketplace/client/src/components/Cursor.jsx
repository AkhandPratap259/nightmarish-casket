import { useEffect, useRef, useState } from 'react';

// D18: mouse-follow trail of torn-paper service snapshots. Small paper
// chips (glyph + service name) spawn behind the cursor as it moves and
// spring away. Fine pointers only; reduced motion and touch get nothing.
const TRAIL_ITEMS = [
  { glyph: '✦', label: 'Cleaning' },
  { glyph: '◍', label: 'Plumbing' },
  { glyph: 'ϟ', label: 'Electrical' },
  { glyph: '❄', label: 'Appliance' },
  { glyph: '⚙', label: 'Repair' },
  { glyph: '✂', label: 'Salon' },
  { glyph: '✎', label: 'Tutoring' },
  { glyph: '⚒', label: 'Fix-it' },
];

const MAX_CHIPS = 12;

export default function Cursor() {
  const ringRef = useRef(null);
  const dotRef = useRef(null);
  const [chips, setChips] = useState([]);
  const idRef = useRef(0);
  const itemRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (window.matchMedia('(pointer: coarse)').matches) return undefined;
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return undefined;

    let x = -100;
    let y = -100;
    let rx = -100;
    let ry = -100;
    let raf = 0;
    let last = 0;
    let lastSpawn = 0;
    let lastSpawnX = -1000;
    let lastSpawnY = -1000;

    const move = (e) => {
      x = e.clientX;
      y = e.clientY;
      ring.style.opacity = '1';
      dot.style.opacity = '1';
      ring.style.transform = `translate(${x - 13}px, ${y - 13}px)`;
      dot.style.transform = `translate(${x - 3}px, ${y - 3}px)`;
      const now = performance.now();
      const dist = Math.hypot(x - lastSpawnX, y - lastSpawnY);
      if (now - lastSpawn > 95 && dist > 30) {
        lastSpawn = now;
        lastSpawnX = x;
        lastSpawnY = y;
        const item = TRAIL_ITEMS[itemRef.current % TRAIL_ITEMS.length];
        itemRef.current += 1;
        const id = idRef.current + 1;
        idRef.current = id;
        const rot = (Math.random() * 14 - 7).toFixed(1);
        setChips((prev) => [
          ...prev.slice(-(MAX_CHIPS - 1)),
          { id, x, y, rot, glyph: item.glyph, label: item.label },
        ]);
      }
    };
    const tick = (t) => {
      if (t - last > 16) {
        rx += (x - rx) * 0.3;
        ry += (y - ry) * 0.3;
        last = t;
      }
      raf = requestAnimationFrame(tick);
    };
    const click = (e) => {
      const ripple = document.createElement('span');
      ripple.className = 'cursor-ripple';
      ripple.style.left = `${e.clientX - 20}px`;
      ripple.style.top = `${e.clientY - 20}px`;
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

  function dropChip(id) {
    setChips((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" style={{ transform: 'translate(-100px, -100px)', opacity: 0 }} />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" style={{ transform: 'translate(-100px, -100px)', opacity: 0 }} />
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="trail-chip"
          aria-hidden="true"
          style={{ left: chip.x, top: chip.y, '--rot': `${chip.rot}deg` }}
          onAnimationEnd={() => dropChip(chip.id)}
        >
          <span className="trail-glyph" aria-hidden="true">{chip.glyph}</span>
          {chip.label}
        </span>
      ))}
    </>
  );
}
