// Data-driven grocery visual from the real planner grocery list: a donut of
// checked vs remaining items plus per-group progress bars. The donut arc and
// bars animate (playful bounce) whenever the checked state changes.
export default function GroceryVisual({ items }) {
  const total = items.length;
  const checked = items.filter((i) => i.checked).length;
  const remaining = total - checked;
  const pct = total ? Math.round((checked / total) * 100) : 0;

  const r = 52;
  const c = 2 * Math.PI * r;
  const doneOffset = c * (1 - (total ? checked / total : 0));

  const groups = ['Fresh', 'Dairy & protein', 'Pantry', 'Other'];
  const byGroup = groups
    .map((g) => {
      const list = items.filter((i) => (g === 'Other' ? !['Fresh', 'Dairy & protein', 'Pantry'].includes(i.group) : i.group === g));
      return { group: g, total: list.length, checked: list.filter((i) => i.checked).length };
    })
    .filter((g) => g.total > 0);

  if (total === 0) return null;

  return (
    <div className="grocery-visual" aria-label={`Shopping progress: ${checked} of ${total} items checked`}>
      <svg className="grocery-donut" viewBox="0 0 120 120" role="img" aria-label={`${pct}% of the grocery list checked`}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#ede2c9" strokeWidth="12" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke="#4a7c59" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={doneOffset} transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
        <text x="60" y="58" textAnchor="middle" className="grocery-donut-text">{pct}%</text>
        <text x="60" y="76" textAnchor="middle" className="grocery-donut-caption">checked</text>
      </svg>
      <div>
        <h2 className="section-title-small" style={{ marginTop: 0 }}>
          {checked} of {total} picked up · {remaining} to go
        </h2>
        <ul className="bar-chart">
          {byGroup.map((g) => (
            <li key={g.group} className="bar-row">
              <span className="bar-label">{g.group}</span>
              <span className="bar-track" aria-hidden="true">
                <span
                  className="bar-fill"
                  style={{ width: `${Math.round((g.checked / g.total) * 100)}%` }}
                />
              </span>
              <span className="bar-value">{g.checked}/{g.total}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
