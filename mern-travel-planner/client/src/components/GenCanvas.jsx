import { useEffect, useRef } from 'react';

// D17 — generative canvas background tied to the app's real data.
// Dashboard mode: one orbit ring per trip; a route polyline through
// destination points (positions hashed from the real destination strings);
// the sun's filled arc is the share of trips that are upcoming or planning.
// Trip mode: the sun arc is the real budget burn-down (total cost / budget),
// the route dots are the trip's days, and the skyline bars are the real
// per-day costs. Everything animates in on a snappy spring; with reduced
// motion the final frame is drawn once and nothing moves.
const PALETTE = ['#e30613', '#ffd400', '#2b5cff', '#ff5ca8', '#00b39a', '#111110'];

function hashStr(s) {
  let h = 7;
  for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

// Snappy-spring step: stiffness/damping tuned to feel like F1.
function springStep(state, target) {
  const stiffness = 0.11;
  const damping = 0.78;
  state.v += (target - state.x) * stiffness;
  state.v *= damping;
  state.x += state.v;
  return state;
}

export default function GenCanvas({ trips = [], tripData = null }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    progress: { x: 0, v: 0 },
    pointer: { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 },
    raf: 0,
    running: false,
    reduced: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const st = stateRef.current;
    st.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      draw();
    }

    function draw() {
      const p = st.reduced ? 1 : Math.max(0, Math.min(1, st.progress.x));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Parallax offset from the pointer (skipped on touch / reduced motion).
      const px = (st.pointer.x - 0.5) * 14;
      const py = (st.pointer.y - 0.5) * 10;

      // Swiss grid — faint verticals and horizontals.
      ctx.strokeStyle = 'rgba(17,17,16,0.07)';
      ctx.lineWidth = 1;
      for (let x = 44 + px * 0.4; x < width; x += 88) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 44 + py * 0.4; y < height; y += 88) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Sun / orbit hub, top right. Its filled arc is real data.
      const cx = width * 0.86 + px;
      const cy = height * 0.2 + py;
      const rings = tripData ? Math.min(5, Math.max(2, tripData.trip.dayCount)) : Math.min(5, Math.max(2, trips.length + 1));
      for (let i = 0; i < rings; i++) {
        const r = 46 + i * 26;
        ctx.beginPath();
        ctx.setLineDash([4, 9]);
        ctx.strokeStyle = 'rgba(17,17,16,0.28)';
        ctx.lineWidth = 1.5;
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      let arcShare = 0;
      if (tripData) {
        const { trip, summary } = tripData;
        arcShare = trip.budget > 0 ? Math.min(1, summary.totalCost / trip.budget) : 0;
      } else if (trips.length > 0) {
        const upcoming = trips.filter((t) => t.status === 'upcoming' || t.status === 'planning').length;
        arcShare = upcoming / trips.length;
      }
      const arcR = 46 + (rings - 1) * 26 + 12;
      ctx.beginPath();
      ctx.strokeStyle = '#e30613';
      ctx.lineWidth = 10;
      ctx.arc(cx, cy, arcR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * arcShare * p);
      ctx.stroke();
      // Sun core — Memphis yellow, pops in with the spring.
      ctx.beginPath();
      ctx.fillStyle = '#ffd400';
      ctx.arc(cx, cy, 26 * p + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = '#111110';
      ctx.lineWidth = 2.5;
      ctx.arc(cx, cy, 26 * p + 2, 0, Math.PI * 2);
      ctx.stroke();

      // Route through real destinations (dashboard) or real days (trip).
      const stops = tripData
        ? tripData.days.map((d, i) => ({ label: `D${i + 1}`, seed: d.date || i }))
        : trips.slice(0, 6).map((t) => ({ label: t.destination, seed: t.destination }));
      if (stops.length > 0) {
        const yBase = height * 0.78 + py;
        const points = stops.map((s, i) => {
          const h = hashStr(s.seed);
          const x = width * (0.08 + (0.84 * (i + 0.5)) / stops.length) + px;
          const y = yBase - (h % 90) * p;
          return { x, y, label: s.label, h };
        });
        // Route line, drawn progressively with the spring.
        ctx.beginPath();
        ctx.strokeStyle = '#e30613';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 6]);
        const drawn = Math.max(1, Math.floor(points.length * p));
        points.slice(0, drawn).forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        // Stops: Memphis-coloured dots with mono labels.
        points.slice(0, drawn).forEach((pt, i) => {
          ctx.beginPath();
          ctx.fillStyle = PALETTE[i % PALETTE.length];
          ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.strokeStyle = '#111110';
          ctx.lineWidth = 2;
          ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#111110';
          ctx.font = '700 11px "JetBrains Mono", monospace';
          ctx.fillText(String(pt.label).slice(0, 18), pt.x + 14, pt.y + 4);
        });
        // Trip mode: per-day cost skyline along the bottom, from real data.
        if (tripData && tripData.analytics) {
          const perDay = tripData.analytics.perDay || [];
          const max = Math.max(1, ...perDay.map((d) => d.total));
          perDay.forEach((d, i) => {
            const bw = Math.min(46, (width * 0.7) / Math.max(1, perDay.length) - 8);
            const bx = width * 0.15 + (i * (width * 0.7)) / Math.max(1, perDay.length);
            const bh = Math.max(4, (d.total / max) * 110 * p);
            ctx.fillStyle = i % 2 === 0 ? 'rgba(43,92,255,0.75)' : 'rgba(255,92,168,0.75)';
            ctx.fillRect(bx, height - 24 - bh, bw, bh);
            ctx.strokeStyle = '#111110';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(bx, height - 24 - bh, bw, bh);
          });
        }
      }

      // Memphis confetti — deterministic, seeded from the trip data.
      const seeds = tripData
        ? [tripData.trip.title, tripData.trip.destination]
        : trips.map((t) => t.destination);
      seeds.slice(0, 8).forEach((seed, i) => {
        const h = hashStr(seed);
        const x = ((h % 100) / 100) * width * 0.9 + width * 0.05 + px * (1 + (i % 3) * 0.3);
        const y = (((h >> 4) % 100) / 100) * height * 0.55 + height * 0.06 + py;
        const size = 7 + (h % 9);
        const colour = PALETTE[(h >> 2) % PALETTE.length];
        if (i % 3 === 0) {
          // Triangle
          ctx.beginPath();
          ctx.fillStyle = colour;
          ctx.moveTo(x, y - size);
          ctx.lineTo(x + size, y + size);
          ctx.lineTo(x - size, y + size);
          ctx.closePath();
          ctx.fill();
        } else if (i % 3 === 1) {
          // Squiggle
          ctx.beginPath();
          ctx.strokeStyle = colour;
          ctx.lineWidth = 3;
          for (let k = 0; k <= 4; k++) {
            const sx = x + k * 6 - 12;
            const sy = y + (k % 2 === 0 ? -5 : 5) * p;
            if (k === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        } else {
          // Dot cluster
          ctx.beginPath();
          ctx.fillStyle = colour;
          ctx.arc(x, y, size * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    function tick() {
      springStep(st.progress, 1);
      st.pointer.x += (st.pointer.tx - st.pointer.x) * 0.12;
      st.pointer.y += (st.pointer.ty - st.pointer.y) * 0.12;
      draw();
      const settled = Math.abs(st.progress.v) < 0.0005 && Math.abs(1 - st.progress.x) < 0.001;
      const pointerSettled = Math.abs(st.pointer.tx - st.pointer.x) < 0.001;
      if (!settled || !pointerSettled) {
        st.raf = requestAnimationFrame(tick);
      } else {
        st.running = false;
        st.progress.x = 1;
        st.progress.v = 0;
        draw();
      }
    }

    function start() {
      if (st.reduced) {
        draw();
        return;
      }
      if (!st.running) {
        st.running = true;
        st.raf = requestAnimationFrame(tick);
      }
    }

    function onPointer(e) {
      if (st.reduced) return;
      st.pointer.tx = e.clientX / Math.max(1, window.innerWidth);
      st.pointer.ty = e.clientY / Math.max(1, window.innerHeight);
      start();
    }

    // Re-animate whenever the underlying data changes.
    st.progress.x = 0;
    st.progress.v = 0;
    resize();
    start();

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    return () => {
      cancelAnimationFrame(st.raf);
      st.running = false;
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
    };
    // Re-run when the data identity changes: trip count / trip id / totals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips.length, tripData ? tripData.trip.id : '', tripData ? tripData.summary.totalCost : 0, tripData ? tripData.days.length : 0]);

  return <canvas ref={canvasRef} className="gen-canvas" aria-hidden="true" />;
}
