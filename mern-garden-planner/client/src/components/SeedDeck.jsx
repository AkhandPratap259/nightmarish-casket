import { useRef, useState } from 'react';
import SeedShape from './SeedShape';

// Drag-and-throw seed cards (interaction D3): pointer drag with velocity,
// inertia after release, and a throw that drops the card onto a bed under
// the pointer. Keyboard users get the same action via the Sow button.
export default function SeedDeck({ plants = [], onThrow, onOpen, onDragOverBed, sowLabel = 'Sow' }) {
  const [drag, setDrag] = useState(null); // { id, x, y, dx, dy }
  const [dragOverBed, setDragOverBed] = useState(null);
  const stateRef = useRef({});
  const rafRef = useRef(null);

  function startDrag(e, plant) {
    if (e.button !== undefined && e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const card = e.currentTarget;
    card.setPointerCapture(e.pointerId);
    stateRef.current = { plant, startX, startY, lastX: startX, lastY: startY, vx: 0, vy: 0, moved: false, t: Date.now() };
    setDrag({ id: plant._id, x: 0, y: 0 });
  }

  function moveDrag(e) {
    const s = stateRef.current;
    if (!s.plant) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) s.moved = true;
    const now = Date.now();
    const dt = Math.max(1, now - s.t);
    s.vx = ((e.clientX - s.lastX) / dt) * 16;
    s.vy = ((e.clientY - s.lastY) / dt) * 16;
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.t = now;
    setDrag({ id: s.plant._id, x: dx, y: dy });
    // Which bed is under the pointer?
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const bedBtn = el && el.closest ? el.closest('.orbit-bed') : null;
    const bedId = bedBtn ? bedBtn.getAttribute('data-bed-id') : null;
    setDragOverBed(bedId);
    if (onDragOverBed) onDragOverBed(bedId);
  }

  function endDrag(e) {
    const s = stateRef.current;
    if (!s.plant) return;
    const wasDrag = s.moved;
    const plant = s.plant;
    const vx = s.vx;
    const vy = s.vy;
    stateRef.current = {};
    // Inertia: keep the card gliding briefly along its velocity, then settle.
    if (wasDrag && (Math.abs(vx) > 2 || Math.abs(vy) > 2)) {
      let x = drag ? drag.x : 0;
      let y = drag ? drag.y : 0;
      let curVx = vx;
      let curVy = vy;
      const step = () => {
        curVx *= 0.86;
        curVy *= 0.86;
        x += curVx;
        y += curVy;
        if (Math.abs(curVx) < 0.6 && Math.abs(curVy) < 0.6) {
          setDrag(null);
          return;
        }
        setDrag({ id: plant._id, x, y });
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
      setTimeout(() => setDrag(null), 450);
    } else {
      setDrag(null);
    }
    // Drop target: a bed under the pointer at release.
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const bedBtn = el && el.closest ? el.closest('.orbit-bed') : null;
    setDragOverBed(null);
    if (onDragOverBed) onDragOverBed(null);
    if (wasDrag && bedBtn && onThrow) {
      onThrow(plant, bedBtn.getAttribute('data-bed-id'));
    } else if (!wasDrag && onOpen) {
      onOpen(plant);
    }
  }

  return (
    <div className="seed-deck">
      {plants.map((plant, i) => {
        const isDragging = drag && drag.id === plant._id;
        const style = isDragging
          ? { transform: `translate(${drag.x}px, ${drag.y}px) rotate(${Math.max(-8, Math.min(8, drag.x / 12))}deg) scale(1.04)`, zIndex: 50 }
          : { animationDelay: `${i * 40}ms` };
        return (
          <article
            key={plant._id}
            className={`seed-card${isDragging ? ' dragging' : ''}`}
            style={style}
            onPointerDown={(e) => startDrag(e, plant)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={() => {
              stateRef.current = {};
              setDrag(null);
              setDragOverBed(null);
            }}
          >
            <SeedShape shape={plant.shape} colour={plant.colour} label={`${plant.name} seed packet`} />
            <h3>{plant.name}</h3>
            <p className="seed-meta">
              {plant.category} · {plant.daysToMaturity} days · {plant.sun} sun
            </p>
            <div className="seed-tags">
              <span className="pill">Water {plant.waterNeed === 3 ? 'thirsty' : plant.waterNeed === 2 ? 'moderate' : 'light'}</span>
              <span className="pill yellow">{plant.season} season</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="btn small primary"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onThrow) onThrow(plant, null);
                }}
              >
                {sowLabel}
              </button>
              <button
                type="button"
                className="btn small ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpen) onOpen(plant);
                }}
              >
                Details
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
