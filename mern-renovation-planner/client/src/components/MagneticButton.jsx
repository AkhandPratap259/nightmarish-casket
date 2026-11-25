import { useRef } from 'react';

export default function MagneticButton({ children, className = '', ...props }) {
  const ref = useRef(null);

  function onMove(e) {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${dx * 0.25}px, ${dy * 0.25}px)`;
  }
  function onLeave() { if (ref.current) ref.current.style.transform = ''; }

  return (
    <button ref={ref} type="button" className={`btn ${className}`} onMouseMove={onMove} onMouseLeave={onLeave} {...props}>
      {children}
    </button>
  );
}
