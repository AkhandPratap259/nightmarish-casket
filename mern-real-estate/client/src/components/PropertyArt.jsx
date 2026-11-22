// Blueprint floor-plan drawings, one per property type. Cyan line work on
// navy grid paper with dimension lines — a drafting-sheet preview, never a
// photo of the property. Hover distortion (D20) is applied by CSS through
// the shared #bp-distort filter defined once in App; the svg here only
// carries the drawing. Each drawing is labelled as an illustrative preview.
export default function PropertyArt({ type, label }) {
  const common = {
    role: 'img',
    'aria-label': `${label || 'Illustrative preview'} — ${type} floor-plan illustration`,
    viewBox: '0 0 240 150',
    preserveAspectRatio: 'xMidYMid slice',
  };
  const grid = (
    <>
      <defs>
        <pattern id="bp-grid-small" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M12 0H0V12" fill="none" stroke="#1b4a7a" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="240" height="150" fill="#0a224e" />
      <rect width="240" height="150" fill="url(#bp-grid-small)" />
    </>
  );
  const dims = (
    <>
      {/* top dimension line */}
      <line x1="20" y1="10" x2="220" y2="10" stroke="#ffd23f" strokeWidth="1.5" />
      <line x1="20" y1="6" x2="20" y2="14" stroke="#ffd23f" strokeWidth="1.5" />
      <line x1="220" y1="6" x2="220" y2="14" stroke="#ffd23f" strokeWidth="1.5" />
      <text x="120" y="7" textAnchor="middle" fill="#ffd23f" fontSize="8" fontWeight="700" letterSpacing="1">PLAN — NOT TO SCALE</text>
      {/* left dimension line */}
      <line x1="8" y1="24" x2="8" y2="136" stroke="#ffd23f" strokeWidth="1.5" />
      <line x1="4" y1="24" x2="12" y2="24" stroke="#ffd23f" strokeWidth="1.5" />
      <line x1="4" y1="136" x2="12" y2="136" stroke="#ffd23f" strokeWidth="1.5" />
    </>
  );
  const wall = '#8fe6ff';
  const line = '#35c8f5';
  const room = { fill: '#8fe6ff', fontSize: 9, fontWeight: 700, letterSpacing: 1.5 };

  if (type === 'house') {
    return (
      <svg {...common} className="prop-art distortable">
        {grid}
        <rect x="52" y="34" width="136" height="92" fill="rgba(53,200,245,.08)" stroke={wall} strokeWidth="3" />
        <line x1="120" y1="34" x2="120" y2="126" stroke={line} strokeWidth="2" />
        <line x1="52" y1="80" x2="120" y2="80" stroke={line} strokeWidth="2" />
        <line x1="120" y1="80" x2="188" y2="80" stroke={line} strokeWidth="2" strokeDasharray="6 4" />
        <rect x="112" y="108" width="16" height="18" fill="none" stroke={wall} strokeWidth="2" />
        <path d="M128 126 A18 18 0 0 0 146 108" fill="none" stroke={line} strokeWidth="1.5" />
        <circle cx="212" cy="26" r="10" fill="none" stroke={line} strokeWidth="2" />
        <text x="66" y="60" {...room}>BED</text>
        <text x="140" y="60" {...room}>LIVING</text>
        <text x="66" y="106" {...room}>KITCHEN</text>
        <text x="140" y="106" {...room}>BATH</text>
        {dims}
      </svg>
    );
  }
  if (type === 'villa') {
    return (
      <svg {...common} className="prop-art distortable">
        {grid}
        <rect x="34" y="30" width="86" height="96" fill="rgba(53,200,245,.08)" stroke={wall} strokeWidth="3" />
        <rect x="120" y="56" width="72" height="70" fill="rgba(53,200,245,.08)" stroke={wall} strokeWidth="3" />
        <line x1="77" y1="30" x2="77" y2="126" stroke={line} strokeWidth="2" />
        <line x1="34" y1="78" x2="77" y2="78" stroke={line} strokeWidth="2" />
        <line x1="120" y1="90" x2="192" y2="90" stroke={line} strokeWidth="2" strokeDasharray="6 4" />
        <rect x="112" y="112" width="16" height="14" fill="none" stroke={wall} strokeWidth="2" />
        <path d="M128 126 A14 14 0 0 0 142 112" fill="none" stroke={line} strokeWidth="1.5" />
        <circle cx="212" cy="26" r="10" fill="none" stroke={line} strokeWidth="2" />
        <text x="44" y="58" {...room}>BED 1</text>
        <text x="44" y="106" {...room}>BED 2</text>
        <text x="130" y="78" {...room}>LIVING</text>
        <text x="130" y="114" {...room}>POOL</text>
        {dims}
      </svg>
    );
  }
  if (type === 'plot') {
    return (
      <svg {...common} className="prop-art distortable">
        {grid}
        <rect x="46" y="28" width="148" height="98" fill="rgba(53,200,245,.06)" stroke="#ffd23f" strokeWidth="2.5" strokeDasharray="10 6" />
        <line x1="46" y1="77" x2="194" y2="77" stroke={line} strokeWidth="2" />
        <line x1="120" y1="28" x2="120" y2="126" stroke={line} strokeWidth="2" />
        <circle cx="52" cy="34" r="4" fill="#ffd23f" />
        <circle cx="188" cy="34" r="4" fill="#ffd23f" />
        <circle cx="52" cy="120" r="4" fill="#ffd23f" />
        <circle cx="188" cy="120" r="4" fill="#ffd23f" />
        <path d="M60 108 h20 M60 114 h14" stroke={line} strokeWidth="2" />
        <text x="72" y="58" {...room}>PLOT A</text>
        <text x="140" y="58" {...room}>PLOT B</text>
        <text x="72" y="106" {...room}>PLOT C</text>
        <text x="140" y="106" {...room}>PLOT D</text>
        {dims}
      </svg>
    );
  }
  if (type === 'commercial') {
    return (
      <svg {...common} className="prop-art distortable">
        {grid}
        <rect x="70" y="24" width="100" height="102" fill="rgba(53,200,245,.08)" stroke={wall} strokeWidth="3" />
        <line x1="70" y1="58" x2="170" y2="58" stroke={line} strokeWidth="2" />
        <line x1="70" y1="92" x2="170" y2="92" stroke={line} strokeWidth="2" />
        <line x1="120" y1="24" x2="120" y2="126" stroke={line} strokeWidth="2" />
        <rect x="82" y="34" width="14" height="12" fill="none" stroke={line} strokeWidth="1.5" />
        <rect x="132" y="34" width="14" height="12" fill="none" stroke={line} strokeWidth="1.5" />
        <rect x="82" y="68" width="14" height="12" fill="none" stroke={line} strokeWidth="1.5" />
        <rect x="132" y="68" width="14" height="12" fill="none" stroke={line} strokeWidth="1.5" />
        <rect x="82" y="102" width="14" height="12" fill="none" stroke={line} strokeWidth="1.5" />
        <rect x="132" y="102" width="14" height="12" fill="none" stroke={line} strokeWidth="1.5" />
        <text x="80" y="52" {...room}>OFFICE</text>
        <text x="130" y="86" {...room}>SHOP</text>
        <text x="80" y="120" {...room}>STORE</text>
        {dims}
      </svg>
    );
  }
  // apartment (default)
  return (
    <svg {...common} className="prop-art distortable">
      {grid}
      <rect x="46" y="28" width="62" height="98" fill="rgba(53,200,245,.08)" stroke={wall} strokeWidth="3" />
      <rect x="132" y="46" width="62" height="80" fill="rgba(53,200,245,.08)" stroke={wall} strokeWidth="3" />
      <line x1="46" y1="77" x2="108" y2="77" stroke={line} strokeWidth="2" />
      <line x1="77" y1="28" x2="77" y2="126" stroke={line} strokeWidth="2" />
      <line x1="132" y1="86" x2="194" y2="86" stroke={line} strokeWidth="2" strokeDasharray="6 4" />
      <rect x="96" y="112" width="12" height="14" fill="none" stroke={wall} strokeWidth="2" />
      <path d="M108 126 A14 14 0 0 0 122 112" fill="none" stroke={line} strokeWidth="1.5" />
      <text x="54" y="56" {...room}>BED 1</text>
      <text x="54" y="106" {...room}>BED 2</text>
      <text x="140" y="72" {...room}>LIVING</text>
      <text x="140" y="112" {...room}>KITCHEN</text>
      {dims}
    </svg>
  );
}
