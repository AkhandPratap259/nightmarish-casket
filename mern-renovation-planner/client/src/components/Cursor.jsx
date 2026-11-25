import { useEffect, useRef } from 'react';

export default function Cursor() {
  const ref = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current;
    if (!el) return;
    let x = -100, y = -100, tx = -100, ty = -100, raf;
    function move(e) { tx = e.clientX; ty = e.clientY; }
    function over(e) { el.classList.toggle('is-hover', !!e.target.closest('button, a, .room-rect, input, select, textarea')); }
    function tick() {
      x += (tx - x) * 0.2; y += (ty - y) * 0.2;
      el.style.left = `${x}px`; el.style.top = `${y}px`;
      raf = requestAnimationFrame(tick);
    }
    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('mouseover', over, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseover', over); cancelAnimationFrame(raf); };
  }, []);

  return <div ref={ref} className="cursor-ring" aria-hidden="true" />;
}
