// Coded inline SVG illustrations, one per property type. Flat shapes in the
// accent/charcoal palette. No stock photos, no external images. Each drawing
// is labelled as an illustrative preview, never a photo of the property.
export default function PropertyArt({ type, label }) {
  const common = {
    role: 'img',
    'aria-label': `${label || 'Illustrative preview'} — ${type} illustration`,
    viewBox: '0 0 240 150',
    preserveAspectRatio: 'xMidYMid slice',
  };
  if (type === 'house') {
    return (
      <svg {...common} className="prop-art">
        <rect width="240" height="150" fill="#efe8d8" />
        <rect x="0" y="118" width="240" height="32" fill="#1c1a17" />
        <rect x="52" y="62" width="136" height="56" fill="#f7f3ea" stroke="#1c1a17" strokeWidth="3" />
        <polygon points="40,66 120,14 200,66" fill="#e85d04" />
        <rect x="108" y="86" width="24" height="32" fill="#1c1a17" />
        <rect x="66" y="76" width="24" height="22" fill="#e85d04" />
        <rect x="150" y="76" width="24" height="22" fill="#e85d04" />
        <circle cx="214" cy="26" r="12" fill="#e85d04" />
      </svg>
    );
  }
  if (type === 'villa') {
    return (
      <svg {...common} className="prop-art">
        <rect width="240" height="150" fill="#efe8d8" />
        <rect x="0" y="118" width="240" height="32" fill="#1c1a17" />
        <rect x="34" y="58" width="86" height="60" fill="#f7f3ea" stroke="#1c1a17" strokeWidth="3" />
        <rect x="120" y="78" width="72" height="40" fill="#e85d04" stroke="#1c1a17" strokeWidth="3" />
        <rect x="28" y="50" width="98" height="8" fill="#1c1a17" />
        <rect x="46" y="72" width="20" height="18" fill="#e85d04" />
        <rect x="80" y="72" width="20" height="18" fill="#1c1a17" />
        <rect x="134" y="88" width="18" height="30" fill="#f7f3ea" />
        <circle cx="212" cy="30" r="10" fill="#e85d04" />
        <rect x="196" y="104" width="6" height="14" fill="#1c1a17" />
        <circle cx="199" cy="100" r="10" fill="#1c1a17" />
      </svg>
    );
  }
  if (type === 'plot') {
    return (
      <svg {...common} className="prop-art">
        <rect width="240" height="150" fill="#efe8d8" />
        <rect x="0" y="118" width="240" height="32" fill="#1c1a17" />
        <rect x="46" y="52" width="148" height="66" fill="#f7f3ea" stroke="#e85d04" strokeWidth="3" strokeDasharray="8 6" />
        <line x1="46" y1="85" x2="194" y2="85" stroke="#1c1a17" strokeWidth="2" />
        <line x1="120" y1="52" x2="120" y2="118" stroke="#1c1a17" strokeWidth="2" />
        <rect x="52" y="58" width="10" height="10" fill="#e85d04" />
        <circle cx="188" cy="58" r="5" fill="#e85d04" />
        <path d="M60 108 h20 M60 112 h14" stroke="#1c1a17" strokeWidth="2" />
      </svg>
    );
  }
  if (type === 'commercial') {
    return (
      <svg {...common} className="prop-art">
        <rect width="240" height="150" fill="#efe8d8" />
        <rect x="0" y="118" width="240" height="32" fill="#1c1a17" />
        <rect x="70" y="18" width="100" height="100" fill="#f7f3ea" stroke="#1c1a17" strokeWidth="3" />
        <rect x="82" y="30" width="18" height="14" fill="#e85d04" />
        <rect x="110" y="30" width="18" height="14" fill="#1c1a17" />
        <rect x="138" y="30" width="18" height="14" fill="#e85d04" />
        <rect x="82" y="54" width="18" height="14" fill="#1c1a17" />
        <rect x="110" y="54" width="18" height="14" fill="#e85d04" />
        <rect x="138" y="54" width="18" height="14" fill="#1c1a17" />
        <rect x="82" y="78" width="18" height="14" fill="#e85d04" />
        <rect x="110" y="78" width="18" height="14" fill="#1c1a17" />
        <rect x="138" y="78" width="18" height="14" fill="#e85d04" />
        <rect x="104" y="100" width="32" height="18" fill="#e85d04" />
      </svg>
    );
  }
  // apartment (default)
  return (
    <svg {...common} className="prop-art">
      <rect width="240" height="150" fill="#efe8d8" />
      <rect x="0" y="118" width="240" height="32" fill="#1c1a17" />
      <rect x="46" y="22" width="62" height="96" fill="#f7f3ea" stroke="#1c1a17" strokeWidth="3" />
      <rect x="132" y="46" width="62" height="72" fill="#e85d04" stroke="#1c1a17" strokeWidth="3" />
      <rect x="58" y="34" width="16" height="14" fill="#e85d04" />
      <rect x="82" y="34" width="16" height="14" fill="#1c1a17" />
      <rect x="58" y="58" width="16" height="14" fill="#1c1a17" />
      <rect x="82" y="58" width="16" height="14" fill="#e85d04" />
      <rect x="58" y="82" width="16" height="14" fill="#e85d04" />
      <rect x="82" y="82" width="16" height="14" fill="#1c1a17" />
      <rect x="142" y="58" width="16" height="14" fill="#f7f3ea" />
      <rect x="166" y="58" width="16" height="14" fill="#f7f3ea" />
      <rect x="142" y="82" width="16" height="14" fill="#f7f3ea" />
      <rect x="166" y="82" width="16" height="14" fill="#f7f3ea" />
      <rect x="70" y="100" width="20" height="18" fill="#1c1a17" />
    </svg>
  );
}
