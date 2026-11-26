// Radial / orbit garden map (layout B7): beds sit on concentric rings
// around a central compost hub. Positions come from each bed's ring + angle.
const COLOURS = { red: '#e30613', blue: '#1b4f9c', yellow: '#f2c200', green: '#1e7d46' };

function polar(ring, angleDeg, rings) {
  // Rings spread from 34% (ring 1) to 46% radius; hub occupies the centre.
  const radiusPct = 30 + ((ring - 1) / Math.max(1, rings - 1 || 1)) * 16 + (rings === 1 ? 8 : 0);
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: 50 + radiusPct * Math.cos(rad), y: 50 + radiusPct * Math.sin(rad) };
}

export default function OrbitMap({ beds = [], rings = 2, onSelectBed, dragOverBed, onDropOnBed }) {
  const ringRadii = Array.from({ length: rings }, (_, i) => 30 + (i / Math.max(1, rings - 1 || 1)) * 16 + (rings === 1 ? 8 : 0));
  return (
    <div className="orbit-stage" role="group" aria-label="Garden orbit map">
      <svg className="orbit-rings" viewBox="0 0 100 100" aria-hidden="true">
        {ringRadii.map((r) => (
          <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#141414" strokeWidth="0.5" strokeDasharray="2 1.6" />
        ))}
        <line x1="50" y1="50" x2="50" y2="4" stroke="#e30613" strokeWidth="0.7" />
        <line x1="50" y1="50" x2="96" y2="50" stroke="#1b4f9c" strokeWidth="0.7" />
      </svg>
      <div className="orbit-hub">
        COMPOST
        <small>CENTRAL HUB</small>
      </div>
      {beds.map((entry, i) => {
        const bed = entry.bed || entry;
        const pos = polar(bed.ring, bed.angle, rings);
        const harmony = entry.harmony;
        const plants = entry.plantings || [];
        return (
          <button
            key={bed._id || bed.id || i}
            type="button"
            className={`orbit-bed${dragOverBed === String(bed._id) ? ' drag-over' : ''}`}
            data-bed-id={bed._id}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, animationDelay: `${i * 60}ms` }}
            onClick={() => onSelectBed && onSelectBed(entry)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (onDropOnBed) onDropOnBed(bed, e);
            }}
            aria-label={`${bed.name}, ring ${bed.ring}, ${entry.usedSlots ?? 0} of ${bed.slots} slots used${harmony != null ? `, harmony ${harmony}` : ''}`}
          >
            {harmony != null && (
              <span className={`harmony-badge${harmony < 50 ? ' low' : harmony < 75 ? ' mid' : ''}`}>{harmony}</span>
            )}
            <span className="bed-name">{bed.name}</span>
            <span className="bed-meta">
              {entry.usedSlots ?? 0}/{bed.slots} slots
            </span>
            <span className="bed-plants" aria-hidden="true">
              {plants.slice(0, 5).map((p, j) => (
                <i key={j} style={{ background: COLOURS[p.plant?.colour || 'green'], borderRadius: p.plant?.shape === 'circle' ? '50%' : 0 }} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
