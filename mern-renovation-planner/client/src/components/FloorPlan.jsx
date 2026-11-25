import { useEffect, useRef, useState } from 'react';

// Interactive SVG blueprint floor plan.
// Rooms are rectangles on navy blueprint paper with a cyan grid.
// Drag a room to move it; drag the yellow corner handle to resize.
// Dimension lines and computed areas update live; changes persist via onRoomChange.
const SCALE = 70; // px per metre
const PAD = 60;

export default function FloorPlan({ rooms, onRoomChange, onSelect, selectedId, readOnly = false }) {
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const [live, setLive] = useState(null);

  const maxX = Math.max(10, ...rooms.map(r => r.x + r.length));
  const maxY = Math.max(8, ...rooms.map(r => r.y + r.width));
  const W = PAD * 2 + maxX * SCALE;
  const H = PAD * 2 + maxY * SCALE;

  function toMetres(e) {
    const svg = svgRef.current;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = pt.matrixTransform(ctm.inverse());
    return { x: (m.x - PAD) / SCALE, y: (m.y - PAD) / SCALE };
  }

  function startDrag(e, room, mode) {
    if (readOnly) return;
    e.preventDefault();
    const p = toMetres(e);
    setDrag({ id: room._id, mode, startX: p.x, startY: p.y, orig: { ...room } });
    setLive({ ...room });
  }

  useEffect(() => {
    if (!drag) return;
    function move(e) {
      const p = toMetres(e);
      const dx = p.x - drag.startX, dy = p.y - drag.startY;
      const r = drag.orig;
      let next;
      if (drag.mode === 'move') {
        next = { ...r, x: Math.max(0, +(r.x + dx).toFixed(2)), y: Math.max(0, +(r.y + dy).toFixed(2)) };
      } else {
        next = { ...r, length: Math.max(0.5, +(r.length + dx).toFixed(2)), width: Math.max(0.5, +(r.width + dy).toFixed(2)) };
      }
      setLive(next);
    }
    function up() {
      if (live) onRoomChange(live._id, { x: live.x, y: live.y, length: live.length, width: live.width });
      setDrag(null); setLive(null);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [drag, live, onRoomChange]);

  const shown = rooms.map(r => (live && live._id === r._id ? live : r));
  const gridLines = [];
  for (let x = 0; x <= maxX; x += 1) gridLines.push(<line key={`v${x}`} x1={PAD + x * SCALE} y1={PAD} x2={PAD + x * SCALE} y2={PAD + maxY * SCALE} stroke="#1E5AA8" strokeWidth="1" />);
  for (let y = 0; y <= maxY; y += 1) gridLines.push(<line key={`h${y}`} x1={PAD} y1={PAD + y * SCALE} x2={PAD + maxX * SCALE} y2={PAD + y * SCALE} stroke="#1E5AA8" strokeWidth="1" />);

  return (
    <div className="blueprint-wrap" role="group" aria-label="Interactive floor plan. Drag rooms to move them, drag the yellow corner handle to resize.">
      <svg ref={svgRef} className="blueprint" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Floor plan blueprint">
        <defs>
          <filter id="wobble-filter" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" />
          </filter>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="#0B2A5B" />
        {gridLines}
        {/* dimension rulers */}
        <line x1={PAD} y1={PAD - 28} x2={PAD + maxX * SCALE} y2={PAD - 28} stroke="#5FD6FF" strokeWidth="1.5" />
        <text x={PAD + (maxX * SCALE) / 2} y={PAD - 34} fill="#5FD6FF" fontSize="13" textAnchor="middle">{maxX.toFixed(1)} m</text>
        <line x1={PAD - 28} y1={PAD} x2={PAD - 28} y2={PAD + maxY * SCALE} stroke="#5FD6FF" strokeWidth="1.5" />
        <text x={PAD - 36} y={PAD + (maxY * SCALE) / 2} fill="#5FD6FF" fontSize="13" textAnchor="middle" transform={`rotate(-90 ${PAD - 36} ${PAD + (maxY * SCALE) / 2})`}>{maxY.toFixed(1)} m</text>

        {shown.map((room) => {
          const rx = PAD + room.x * SCALE, ry = PAD + room.y * SCALE;
          const rw = room.length * SCALE, rh = room.width * SCALE;
          const area = (room.length * room.width).toFixed(1);
          const selected = selectedId === room._id;
          return (
            <g key={room._id} className="wobble" onClick={() => onSelect && onSelect(room)}>
              <rect
                className="room-rect"
                x={rx} y={ry} width={rw} height={rh}
                fill={room.colour || '#FFD400'} fillOpacity="0.85"
                stroke={selected ? '#FF3B30' : '#111'} strokeWidth={selected ? 5 : 3}
                onPointerDown={(e) => startDrag(e, room, 'move')}
              />
              <text x={rx + rw / 2} y={ry + rh / 2 - 6} fill="#111" fontSize="15" fontWeight="700" textAnchor="middle">{room.name}</text>
              <text x={rx + rw / 2} y={ry + rh / 2 + 14} fill="#111" fontSize="12" textAnchor="middle">{room.length.toFixed(1)} × {room.width.toFixed(1)} m · {area} m²</text>
              {/* bottom dimension line */}
              <line x1={rx} y1={ry + rh + 14} x2={rx + rw} y2={ry + rh + 14} stroke="#5FD6FF" strokeWidth="1.5" />
              <text x={rx + rw / 2} y={ry + rh + 30} fill="#5FD6FF" fontSize="12" textAnchor="middle">{room.length.toFixed(2)} m</text>
              {!readOnly && (
                <rect
                  className="room-handle" x={rx + rw - 9} y={ry + rh - 9} width="18" height="18"
                  onPointerDown={(e) => { e.stopPropagation(); startDrag(e, room, 'resize'); }}
                />
              )}
            </g>
          );
        })}
      </svg>
      <p style={{ color: '#5FD6FF', padding: '10px 14px', margin: 0, fontSize: '0.9rem' }}>
        {readOnly ? 'Blueprint preview — open a project to drag and resize rooms.' : 'Drag a room to move it. Drag the yellow corner to resize. Sizes and positions save automatically.'}
      </p>
    </div>
  );
}
