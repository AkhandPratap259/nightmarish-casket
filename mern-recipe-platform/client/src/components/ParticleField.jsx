import { useEffect, useRef } from 'react';

// D11 — Pointer-reactive dot/particle field on canvas (primary interaction).
// Earth-tone seed dots drift slowly and spring away from the pointer with a
// playful-bounce ease, then settle back. Fixed behind the app, pointer-events
// none. Disabled on coarse pointers, reduced motion, or when the tab hides.
const COLOURS = ['#4a7c59', '#c4552d', '#d9a441', '#7a8b5a', '#b4663f'];

export default function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (window.matchMedia('(pointer: coarse)').matches) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = Math.min(2, window.devicePixelRatio || 1);
    const mouse = { x: -9999, y: -9999 };
    let particles = [];

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.floor((w * h) / 22000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        ox: 0,
        oy: 0,
        vx: 0,
        vy: 0,
        r: 2 + Math.random() * 4.5,
        baseR: 2 + Math.random() * 4.5,
        colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
        drift: 0.15 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.25 + Math.random() * 0.35,
      }));
      particles.forEach((p) => { p.ox = p.x; p.oy = p.y; });
    }

    let last = 0;
    function tick(now) {
      const dt = Math.min(32, now - last || 16);
      last = now;
      ctx.clearRect(0, 0, w, h);
      const t = now / 1000;
      particles.forEach((p) => {
        // Gentle organic drift around the home position.
        const hx = p.ox + Math.sin(t * p.drift + p.phase) * 14;
        const hy = p.oy + Math.cos(t * p.drift * 0.8 + p.phase) * 12;
        // Pointer repulsion with a springy return.
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 130 && dist > 0.1) {
          const force = (1 - dist / 130) * 3.2;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
        // Spring back toward the drifting home point (bounce-flavoured).
        const k = 0.02;
        p.vx += (hx - p.x) * k * (dt / 16);
        p.vy += (hy - p.y) * k * (dt / 16);
        p.vx *= 0.88;
        p.vy *= 0.88;
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        // Radius swells near the pointer.
        const targetR = dist < 130 ? p.baseR * (1 + (1 - dist / 130) * 0.9) : p.baseR;
        p.r += (targetR - p.r) * 0.15;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.colour;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    }

    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else { last = performance.now(); raf = requestAnimationFrame(tick); }
    };

    resize();
    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeave);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-field" aria-hidden="true" />;
}
