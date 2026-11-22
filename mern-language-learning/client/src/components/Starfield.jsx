import { useEffect, useRef } from 'react';

// Observatory star field: a fixed canvas of twinkling stars plus faint
// orbit lines, drawn once and twinkled in stepped jumps (F4). Static when
// prefers-reduced-motion is set. Pure decoration — aria-hidden.
export default function Starfield() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let stars = [];
    let orbits = [];
    let w = 0;
    let h = 0;

    function seed() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = Math.min(170, Math.floor((w * h) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h * 0.85,
        r: Math.random() * 1.4 + 0.4,
        base: Math.random() * 0.55 + 0.25,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.9 + 0.25,
        // a few stars are pink or cyan; most are white
        color: Math.random() < 0.12 ? '255,46,136' : Math.random() < 0.18 ? '34,230,255' : '242,240,255',
      }));
      orbits = [
        { cx: w * 0.82, cy: h * 0.18, rx: Math.min(220, w * 0.22), ry: 46, tilt: -0.35 },
        { cx: w * 0.12, cy: h * 0.72, rx: Math.min(180, w * 0.18), ry: 36, tilt: 0.3 },
      ];
    }

    function draw(now) {
      ctx.clearRect(0, 0, w, h);
      // Orbit lines first, faint.
      ctx.lineWidth = 1;
      for (const o of orbits) {
        ctx.save();
        ctx.translate(o.cx, o.cy);
        ctx.rotate(o.tilt);
        ctx.strokeStyle = 'rgba(69,83,154,0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 0, o.rx, o.ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      for (const s of stars) {
        // Stepped twinkle: opacity jumps between 4 discrete levels.
        const step = reduced
          ? s.base
          : s.base * (0.55 + 0.45 * Math.abs(Math.sin(now * 0.0006 * s.speed + s.phase)));
        const stepped = Math.round(step * 4) / 4;
        ctx.fillStyle = `rgba(${s.color},${stepped.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    }

    seed();
    draw(0);
    const onResize = () => {
      seed();
      draw(0);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}
