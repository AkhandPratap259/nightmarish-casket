import { useEffect, useRef, useState } from 'react';
import { formatDateShort } from '../api.js';

// B16 infinite canvas with pan and zoom + B7 radial/orbit layout (MIXUP):
// the trip's days sit on orbit rings around a central hub; panning, zooming
// and a radial menu (D15) fan out from the selected day node. Dragging the
// canvas background pans; the wheel zooms to the cursor; buttons do the same
// for touch and keyboard users. Arrow keys pan when the canvas is focused.
const WORLD_W = 1160;
const WORLD_H = 760;
const HUB = { x: WORLD_W / 2, y: WORLD_H / 2 };

function nodePosition(index, total) {
  if (total <= 12) {
    const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
    const r = 272;
    return { x: HUB.x + Math.cos(angle) * r, y: HUB.y + Math.sin(angle) * r, ring: 0 };
  }
  // Long trips get two rings: first half inside, second half outside.
  const half = Math.ceil(total / 2);
  if (index < half) {
    const angle = -Math.PI / 2 + (index / half) * Math.PI * 2;
    return { x: HUB.x + Math.cos(angle) * 178, y: HUB.y + Math.sin(angle) * 178, ring: 0 };
  }
  const rest = total - half;
  const angle = -Math.PI / 2 + ((index - half) / rest) * Math.PI * 2;
  return { x: HUB.x + Math.cos(angle) * 308, y: HUB.y + Math.sin(angle) * 308, ring: 1 };
}

const RADIAL_ACTIONS = [
  { id: 'activity', glyph: '+', label: 'Activity', angle: -90 },
  { id: 'expense', glyph: '₹', label: 'Expense', angle: 0 },
  { id: 'packing', glyph: '▣', label: 'Pack', angle: 90 },
  { id: 'invite', glyph: '✉', label: 'Invite', angle: 180 },
];

export default function OrbitCanvas({
  trip,
  days,
  selectedIndex,
  onSelectDay,
  onAddActivity,
  onLogExpense,
  onAddPacking,
  onInvite,
  canEdit,
  isOwner,
}) {
  const containerRef = useRef(null);
  const nodeRefs = useRef({});
  const dragRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [radialFor, setRadialFor] = useState(null);
  const [animated, setAnimated] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Fit the world on small screens on first mount.
  useEffect(() => {
    if (window.matchMedia('(max-width: 900px)').matches) setScale(0.62);
  }, []);

  // Wheel zoom needs a non-passive listener: React attaches onWheel as
  // passive, so preventDefault would be ignored and the page would scroll.
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onNativeWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
      const next = Math.max(0.5, Math.min(1.6, scaleRef.current * factor));
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      setPan((p) => ({
        x: cx - ((cx - p.x) * next) / scaleRef.current,
        y: cy - ((cy - p.y) * next) / scaleRef.current,
      }));
      setScale(next);
    };
    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => el.removeEventListener('wheel', onNativeWheel);
  }, []);

  const positions = days.map((d, i) => nodePosition(i, days.length));
  const selectedPos = positions[selectedIndex] || positions[0];

  function applyZoom(nextScale, centre) {
    const clamped = Math.max(0.5, Math.min(1.6, nextScale));
    setAnimated(true);
    window.setTimeout(() => setAnimated(false), 260);
    if (!centre || !containerRef.current) {
      setScale(clamped);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const cx = centre.x - rect.left - rect.width / 2;
    const cy = centre.y - rect.top - rect.height / 2;
    setPan((p) => ({
      x: cx - ((cx - p.x) * clamped) / scale,
      y: cy - ((cy - p.y) * clamped) / scale,
    }));
    setScale(clamped);
  }

  function resetView() {
    setAnimated(true);
    window.setTimeout(() => setAnimated(false), 260);
    setPan({ x: 0, y: 0 });
    setScale(window.matchMedia('(max-width: 900px)').matches ? 0.62 : 1);
    setRadialFor(null);
  }

  function onPointerDown(e) {
    // Only the canvas background starts a pan — nodes and buttons keep theirs.
    // A background press also dismisses an open radial menu.
    if (e.target.closest('button') || e.target.closest('.radial-menu')) return;
    if (radialFor !== null) setRadialFor(null);
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y, moved: false };
    containerRef.current.setPointerCapture(e.pointerId);
    setIsDragging(true);
  }

  function onPointerMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    setPan({ x: drag.panX + dx, y: drag.panY + dy });
  }

  function onPointerUp() {
    dragRef.current = null;
    setIsDragging(false);
  }

  function onKeyDown(e) {
    const step = 48;
    if (e.key === 'ArrowLeft') { setPan((p) => ({ ...p, x: p.x + step })); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setPan((p) => ({ ...p, x: p.x - step })); e.preventDefault(); }
    if (e.key === 'ArrowUp') { setPan((p) => ({ ...p, y: p.y + step })); e.preventDefault(); }
    if (e.key === 'ArrowDown') { setPan((p) => ({ ...p, y: p.y - step })); e.preventDefault(); }
    if (e.key === '+' || e.key === '=') { applyZoom(scale * 1.25); e.preventDefault(); }
    if (e.key === '-') { applyZoom(scale / 1.25); e.preventDefault(); }
    if (e.key === 'Escape' && radialFor !== null) {
      setRadialFor(null);
      const node = nodeRefs.current[radialFor];
      if (node) node.focus();
    }
  }

  function openRadial(index, e) {
    onSelectDay(index);
    setRadialFor(index);
    e.currentTarget.focus();
  }

  function runAction(actionId) {
    const day = days[radialFor];
    setRadialFor(null);
    if (actionId === 'activity') onAddActivity(day);
    if (actionId === 'expense') onLogExpense(day);
    if (actionId === 'packing') onAddPacking(day);
    if (actionId === 'invite') onInvite(day);
    const node = nodeRefs.current[radialFor];
    if (node) node.focus();
  }

  const radialActions = RADIAL_ACTIONS.filter((a) => {
    if (a.id === 'invite') return isOwner;
    return canEdit;
  });

  const routePath = positions
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div>
      <div className="orbit-toolbar">
        <button type="button" className="btn btn-small" onClick={() => applyZoom(scale * 1.25)} aria-label="Zoom in">+ Zoom</button>
        <button type="button" className="btn btn-small" onClick={() => applyZoom(scale / 1.25)} aria-label="Zoom out">− Zoom</button>
        <button type="button" className="btn btn-small btn-ghost" onClick={resetView}>Reset view</button>
        <span className="orbit-zoom-readout" aria-live="polite">{Math.round(scale * 100)}%</span>
        <span className="orbit-hint">Drag to pan · Scroll to zoom · Arrow keys pan · Tap a day for its menu</span>
      </div>

      <div
        ref={containerRef}
        className={`orbit-canvas ${isDragging ? 'is-dragging' : ''}`}
        role="region"
        aria-label={`Itinerary canvas for ${trip.title}. ${days.length} days arranged on an orbit ring. Drag to pan, scroll to zoom, use the arrow keys to pan.`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div
          className={`orbit-world ${animated ? 'is-animated' : ''}`}
          style={{ '--px': `${pan.x}px`, '--py': `${pan.y}px`, '--scale': scale }}
        >
          <div className="orbit-ring" style={{ width: 544, height: 544, left: HUB.x, top: HUB.y }} aria-hidden="true" />
          {days.length > 12 ? (
            <div className="orbit-ring" style={{ width: 616, height: 616, left: HUB.x, top: HUB.y }} aria-hidden="true" />
          ) : null}
          <svg className="orbit-route" viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} aria-hidden="true">
            <path d={routePath} fill="none" stroke="#e30613" strokeWidth="3" strokeDasharray="12 8" />
          </svg>

          <div className="orbit-hub">
            <div className="orbit-hub-title">{trip.destination}</div>
            <div className="orbit-hub-sub">
              {days.length} days · {trip.travellers} traveller{trip.travellers === 1 ? '' : 's'}
            </div>
          </div>

          {days.map((d, i) => {
            const pos = positions[i];
            const isToday = new Date(d.date).toDateString() === today.toDateString();
            return (
              <button
                key={d.index}
                ref={(el) => { nodeRefs.current[i] = el; }}
                type="button"
                className={`orbit-node ${i === selectedIndex ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                style={{ left: pos.x, top: pos.y }}
                aria-pressed={i === selectedIndex}
                aria-label={`Day ${i + 1}, ${formatDateShort(d.date)}, ${d.activities.length} activities. Activate to open its menu.`}
                onClick={(e) => openRadial(i, e)}
              >
                <span className="orbit-node-num">D{String(i + 1).padStart(2, '0')}</span>
                <span className="orbit-node-date">{formatDateShort(d.date)}</span>
                <span className="orbit-node-count">{d.activities.length} act.</span>
              </button>
            );
          })}

          {radialFor !== null && selectedPos && radialActions.length > 0 ? (
            <div
              className="radial-menu"
              style={{ left: selectedPos.x, top: selectedPos.y }}
              role="menu"
              aria-label={`Actions for Day ${radialFor + 1}`}
            >
              {radialActions.map((a, i) => {
                const angle = (a.angle * Math.PI) / 180;
                const r = 92;
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                return (
                  <button
                    key={a.id}
                    type="button"
                    className="radial-item"
                    role="menuitem"
                    style={{ left: x, top: y, '--delay': `${i * 45}ms` }}
                    autoFocus={i === 0}
                    onClick={() => runAction(a.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        setRadialFor(null);
                        const node = nodeRefs.current[radialFor];
                        if (node) node.focus();
                      }
                    }}
                  >
                    <span className="radial-item-glyph" aria-hidden="true">{a.glyph}</span>
                    {a.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
