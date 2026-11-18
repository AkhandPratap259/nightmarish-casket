import { muscleLabel } from '../data/config.js';

// Horizontal bars showing how many completed sets fall into each muscle
// group, so imbalances are visible at a glance.
export default function MuscleSplit({ split }) {
  if (!split || split.length === 0) {
    return <p className="muted">No completed sets yet — finish a session to see your split.</p>;
  }
  const max = Math.max(1, ...split.map((s) => s.sets));
  return (
    <ul className="muscle-split" aria-label="Sets per muscle group">
      {split.map((row) => (
        <li key={row.muscleGroup} className="muscle-split-row">
          <span className="muscle-split-name">{muscleLabel(row.muscleGroup)}</span>
          <span className="muscle-split-track">
            <span
              className="muscle-split-fill"
              style={{ width: `${Math.round((row.sets / max) * 100)}%` }}
            />
          </span>
          <span className="muscle-split-count">
            {row.sets} set{row.sets === 1 ? '' : 's'}
          </span>
        </li>
      ))}
    </ul>
  );
}
