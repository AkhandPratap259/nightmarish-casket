import { categoryLabel } from '../data/config';

// Flat-colour panel with the campaign's initial letter and category label.
// Labelled "Illustrative preview" — no stock photos, no generic illustrations.
export default function CampaignArt({ title = 'F', category, size = 'medium' }) {
  const letter = (title || 'F').trim().charAt(0).toUpperCase() || 'F';
  return (
    <div className={`campaign-art campaign-art-${size}`} aria-hidden="true">
      <span className="campaign-art-letter">{letter}</span>
      <span className="campaign-art-cat">{categoryLabel(category)}</span>
      <span className="campaign-art-note">Illustrative preview</span>
    </div>
  );
}
