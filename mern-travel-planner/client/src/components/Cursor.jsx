import { useEffect, useRef } from 'react';

// Swiss red square cursor — a small outlined square with a black centre dot
// that rotates 45 degrees over interactive elements and fills on press.
// No glow, no trail. Hidden on touch devices and with reduced motion.
export default function Cursor() {
  const squareRef = useRef(null);

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
      const target = e.target;
      const interactive =
        target && target.closest
          ? target.closest('button, a, input, select, textarea, [role="tab"], [draggable="true"]')
          : null;
      if (squareRef.current) squareRef.current.classList.toggle('is-hover', Boolean(interactive));
    };
    const onDown = () => {
      down = true;
    };
    const onUp = () => {
      down = false;
    };
    const loop = () => {
      rx += (x - rx) * 0.4;
      ry += (y - ry) * 0.4;
      if (squareRef.current) {
        squareRef.current.style.left = `${rx}px`;
        squareRef.current.style.top = `${ry}px`;
        squareRef.current.classList.toggle('is-down', down);
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

  return <div ref={squareRef} className="cursor-square" aria-hidden="true" />;
}
