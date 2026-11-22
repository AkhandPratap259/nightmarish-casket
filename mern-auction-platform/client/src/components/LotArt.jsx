// LotArt — an original, code-built lot visual. No stock photos: a bold
// monogram from the lot title, misregistered in riso red over riso blue,
// in front of overprinted Bauhaus shapes (circle, triangle, semicircle)
// chosen deterministically from the lot's category, plus a halftone
// corner and a yellow category ticket.
export function monogram(title) {
  const words = String(title || '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'BS';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const SHAPES = [
  // [type, x, y, size, colour] — drawn in SVG, blended multiply so the
  // inks overprint like a two-colour riso print.
  [
    { type: 'circle', cx: 26, cy: 30, r: 26, fill: '#e8442e' },
    { type: 'triangle', x: 52, y: 8, s: 44, fill: '#f2c200' },
    { type: 'semicircle', cx: 74, cy: 78, r: 22, fill: '#1d3fae' },
  ],
  [
    { type: 'semicircle', cx: 22, cy: 66, r: 26, fill: '#f2c200' },
    { type: 'circle', cx: 66, cy: 26, r: 24, fill: '#1d3fae' },
    { type: 'triangle', x: 48, y: 48, s: 42, fill: '#e8442e' },
  ],
  [
    { type: 'triangle', x: 10, y: 12, s: 46, fill: '#1d3fae' },
    { type: 'circle', cx: 70, cy: 62, r: 26, fill: '#e8442e' },
    { type: 'semicircle', cx: 30, cy: 78, r: 20, fill: '#f2c200' },
  ],
  [
    { type: 'circle', cx: 50, cy: 46, r: 30, fill: '#f2c200' },
    { type: 'semicircle', cx: 78, cy: 30, r: 22, fill: '#e8442e' },
    { type: 'triangle', x: 12, y: 52, s: 40, fill: '#1d3fae' },
  ],
];

function shapePath(shape) {
  if (shape.type === 'circle') {
    return <circle key={`${shape.cx}-${shape.cy}`} cx={shape.cx} cy={shape.cy} r={shape.r} fill={shape.fill} />;
  }
  if (shape.type === 'triangle') {
    const { x, y, s } = shape;
    return (
      <polygon
        key={`${x}-${y}`}
        points={`${x},${y + s} ${x + s / 2},${y} ${x + s},${y + s}`}
        fill={shape.fill}
      />
    );
  }
  // Semicircle: flat edge down.
  return (
    <path
      key={`${shape.cx}-${shape.cy}`}
      d={`M ${shape.cx - shape.r} ${shape.cy} A ${shape.r} ${shape.r} 0 0 1 ${shape.cx + shape.r} ${shape.cy} Z`}
      fill={shape.fill}
    />
  );
}

export default function LotArt({ title, category, label, className = '' }) {
  const categories = ['watches', 'art', 'collectibles', 'tech', 'sneakers', 'memorabilia', 'vintage', 'home'];
  const idx = Math.max(0, categories.indexOf(category || '')) % SHAPES.length;
  const shapes = SHAPES[idx];
  return (
    <div className={`lot-art ${className}`} aria-hidden="true">
      <svg className="lot-art-shapes" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <g style={{ mixBlendMode: 'multiply' }}>{shapes.map(shapePath)}</g>
      </svg>
      <span className="lot-art-disc" />
      <span className="lot-art-mono">{monogram(title)}</span>
      <span className="lot-art-cat">{label || category}</span>
    </div>
  );
}
