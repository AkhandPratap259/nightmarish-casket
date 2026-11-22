// Hero blueprint floor plan — the signature moment. A drafting-sheet plan
// of a home, drawn from the cheapest listing's real figures (bedrooms and
// area), with dimension lines and a slow stroke draw-in (F2). Hovering the
// sheet distorts it (D20, CSS filter #bp-distort). Labelled illustrative:
// the plan is a drawing, not a photo or a surveyed layout of the property.
export default function FloorPlan({ property }) {
  const beds = property?.beds ?? 2;
  const area = property?.areaSqft ?? 0;
  const city = property ? `${property.locality}, ${property.city}` : '';
  return (
    <svg
      className="floorplan distortable"
      viewBox="0 0 520 340"
      role="img"
      aria-label={`Illustrative blueprint floor plan of a ${beds}-bedroom home${area ? `, ${area.toLocaleString('en-IN')} square feet` : ''}${city ? ` in ${city}` : ''}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id="fp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#1b4a7a" strokeWidth="0.6" />
        </pattern>
        <pattern id="fp-grid-major" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M100 0H0V100" fill="none" stroke="#2c5a8f" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="520" height="340" fill="#0a224e" />
      <rect width="520" height="340" fill="url(#fp-grid)" />
      <rect width="520" height="340" fill="url(#fp-grid-major)" />

      {/* outer walls — drawn in slowly */}
      <g className="fp-draw">
        <rect x="70" y="60" width="380" height="220" className="fp-fill" stroke="none" />
        <rect x="70" y="60" width="380" height="220" className="fp-wall" />
        <line x1="260" y1="60" x2="260" y2="280" className="fp-line" />
        <line x1="70" y1="170" x2="260" y2="170" className="fp-line" />
        <line x1="260" y1="170" x2="450" y2="170" className="fp-line" strokeDasharray="8 5" />
        <line x1="355" y1="170" x2="355" y2="280" className="fp-line" />
        {/* door swings */}
        <path d="M260 280 A40 40 0 0 0 300 240" className="fp-line" />
        <path d="M160 170 A36 36 0 0 0 196 134" className="fp-line" />
        <path d="M450 220 A34 34 0 0 0 416 186" className="fp-line" />
      </g>

      {/* room labels */}
      <text x="100" y="100" className="fp-room">BED 1</text>
      <text x="100" y="200" className="fp-room">BED {beds > 1 ? 2 : 1}</text>
      <text x="290" y="100" className="fp-room">LIVING</text>
      <text x="290" y="200" className="fp-room">KITCHEN</text>
      <text x="380" y="250" className="fp-room">BATH</text>

      {/* top dimension line — real area */}
      <line x1="70" y1="34" x2="450" y2="34" className="fp-dim" />
      <line x1="70" y1="26" x2="70" y2="42" className="fp-dim" />
      <line x1="450" y1="26" x2="450" y2="42" className="fp-dim" />
      <text x="260" y="24" textAnchor="middle" className="fp-text">
        {area ? `${area.toLocaleString('en-IN')} SQ FT` : 'FLOOR PLAN'}
      </text>
      {/* left dimension line — real bedroom count */}
      <line x1="44" y1="60" x2="44" y2="280" className="fp-dim" />
      <line x1="36" y1="60" x2="52" y2="60" className="fp-dim" />
      <line x1="36" y1="280" x2="52" y2="280" className="fp-dim" />
      <text x="30" y="170" textAnchor="middle" className="fp-text" transform="rotate(-90 30 170)">
        {beds} BED
      </text>
      {/* north arrow + sheet number */}
      <g>
        <circle cx="486" cy="44" r="16" className="fp-line" />
        <path d="M486 56 L486 36 M486 36 L480 46 M486 36 L492 46" className="fp-line" />
        <text x="486" y="80" textAnchor="middle" className="fp-text">N</text>
      </g>
      <text x="70" y="316" className="fp-text">SHEET A-101 — ILLUSTRATIVE PLAN, NOT TO SCALE</text>
      <text x="450" y="316" textAnchor="end" className="fp-text">NESTHUNT</text>
    </svg>
  );
}
