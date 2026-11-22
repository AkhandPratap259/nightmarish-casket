import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// D5: 3D tilt card with depth layers. Pointer-follow tilt on fine pointers;
// on touch the CSS :active scale in styles.css takes over instead.
export default function TiltCard({ to, className = '', children, ...rest }) {
  const ref = useRef(null);

  function onMove(e) {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg) translateY(-6px)`;
  }

  function onLeave() {
    if (ref.current) ref.current.style.transform = '';
  }

  return (
    <Link
      ref={ref}
      to={to}
      className={className}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      {...rest}
    >
      {children}
    </Link>
  );
}
