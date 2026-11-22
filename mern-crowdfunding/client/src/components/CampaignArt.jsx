import { categoryLabel } from '../data/config';

// Code-drawn Y2K chrome panel: metallic gradient, floating bubbles and
// four-point stars in the theme's style — no stock photos, no generic
// illustrations. The bubble positions are deterministic per campaign title,
// so the same campaign always draws the same art.
function bubbleSeeds(title) {
  let h = 0;
  for (let i = 0; i < (title || '').length; i += 1) h = (h * 31 + title.charCodeAt(i)) % 997;
  return [
    { left: `${8 + (h % 40)}%`, top: `${10 + ((h * 7) % 30)}%`, size: 14 + (h % 18) },
    { left: `${55 + ((h * 3) % 30)}%`, top: `${58 + ((h * 5) % 25)}%`, size: 10 + ((h * 11) % 16) },
    { left: `${30 + ((h * 13) % 35)}%`, top: `${70 + ((h * 2) % 18)}%`, size: 8 + ((h * 7) % 10) },
  ];
}

export default function CampaignArt({ title = 'F', category, size = 'medium' }) {
  const letter = (title || 'F').trim().charAt(0).toUpperCase() || 'F';
  const bubbles = bubbleSeeds(title);
  return (
    <div className={`campaign-art campaign-art-${size}`} aria-hidden="true">
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="campaign-art-bubble"
          style={{ left: b.left, top: b.top, width: b.size, height: b.size }}
        />
      ))}
      <span className="campaign-art-letter">{letter}</span>
      <span className="campaign-art-cat">{categoryLabel(category)}</span>
      <span className="campaign-art-note">Illustrative preview</span>
    </div>
  );
}
