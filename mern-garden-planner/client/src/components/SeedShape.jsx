// Bauhaus geometry for a seed packet: shape + primary colour, drawn as SVG.
const COLOURS = { red: '#e30613', blue: '#1b4f9c', yellow: '#f2c200', green: '#1e7d46' };

export default function SeedShape({ shape = 'circle', colour = 'green', className = 'seed-shape', label }) {
  const fill = COLOURS[colour] || COLOURS.green;
  const ink = '#141414';
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label={label || `${colour} ${shape}`}>
      {shape === 'circle' && <circle cx="32" cy="32" r="26" fill={fill} stroke={ink} strokeWidth="3" />}
      {shape === 'triangle' && <path d="M32 6 L58 56 L6 56 Z" fill={fill} stroke={ink} strokeWidth="3" strokeLinejoin="round" />}
      {shape === 'square' && <rect x="8" y="8" width="48" height="48" fill={fill} stroke={ink} strokeWidth="3" />}
      {shape === 'semicircle' && (
        <>
          <path d="M6 40 A26 26 0 0 1 58 40 Z" fill={fill} stroke={ink} strokeWidth="3" />
          <rect x="6" y="40" width="52" height="16" fill={fill} stroke={ink} strokeWidth="3" />
        </>
      )}
      <circle cx="32" cy="32" r="5" fill="#fff6e5" stroke={ink} strokeWidth="2.5" />
    </svg>
  );
}

export function shapeColourHex(colour) {
  return COLOURS[colour] || COLOURS.green;
}
