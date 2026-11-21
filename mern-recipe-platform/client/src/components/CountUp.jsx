import { useEffect, useRef, useState } from 'react';

// Count-up number that animates once when it scrolls into view. With
// reduced motion (or no IntersectionObserver) it renders the final value.
export default function CountUp({ value, suffix = '' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(0);
  const target = Number(value) || 0;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(target);
      return undefined;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(target);
      return undefined;
    }
    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - start) / 900);
          setShown(Math.round(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target]);

  return (
    <span ref={ref}>
      {shown}
      {suffix}
    </span>
  );
}
