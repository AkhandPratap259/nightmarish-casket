import { useEffect, useRef } from 'react';

// Multi-layer parallax (D9): translates its children against the scroll
// position, at a fraction of the scroll speed given by `speed` (0.1–0.6).
// Disabled under prefers-reduced-motion and on coarse pointers, where the
// layer simply stays still — the layout never depends on the offset.
export default function Parallax({ speed = 0.25, className = '', children, style }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (window.matchMedia('(pointer: coarse)').matches) return undefined;
    let raf = 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      // -1 when the element is at the top of the viewport, +1 at the bottom.
      const progress = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - vh / 2) / (vh / 2)));
      el.style.setProperty('--px', `${(-progress * speed * 60).toFixed(1)}px`);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [speed]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...style, transform: 'translate3d(0, var(--px, 0px), 0)', willChange: 'transform' }}
    >
      {children}
    </div>
  );
}
