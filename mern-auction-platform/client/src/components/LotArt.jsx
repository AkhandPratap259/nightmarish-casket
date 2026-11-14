// LotArt — an original, code-built lot visual. No stock photos: a bold
// monogram from the lot title, a category label and a ruled pattern on a
// charcoal panel with an acid-lime accent bar.
export function monogram(title) {
  const words = String(title || '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'BS';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function LotArt({ title, category, label, className = '' }) {
  return (
    <div className={`lot-art ${className}`} aria-hidden="true">
      <span className="lot-art-mono">{monogram(title)}</span>
      <span className="lot-art-rule" />
      <span className="lot-art-rule" />
      <span className="lot-art-rule" />
      <span className="lot-art-cat">{label || category}</span>
      <span className="lot-art-bar" />
    </div>
  );
}
