// Data-driven chart: expected harvests in the next 30 days, drawn from the
// garden's real plantings. Bars animate when the data changes.
const BAR_COLOURS = ['#e30613', '#1b4f9c', '#f2c200', '#1e7d46'];

export default function HarvestChart({ items = [] }) {
  if (!items || items.length === 0) {
    return (
      <div className="empty">
        <p><strong>No harvests due in the next 30 days.</strong></p>
        <p className="muted">Sow something and its harvest will appear here as the date approaches.</p>
      </div>
    );
  }
  // Group by plant name so one bar stands per crop.
  const grouped = [];
  for (const item of items) {
    const found = grouped.find((g) => g.plant === item.plant);
    if (found) found.count += 1;
    else grouped.push({ plant: item.plant, count: 1, days: item.days });
  }
  grouped.sort((a, b) => a.days - b.days);
  const max = Math.max(...grouped.map((g) => g.count));
  return (
    <div>
      <div className="chart-bars" role="img" aria-label={`Harvest forecast: ${grouped.map((g) => `${g.plant} ${g.count}`).join(', ')}`}>
        {grouped.map((g, i) => (
          <div className="chart-bar" key={g.plant}>
            <span className="bar-value">{g.count}</span>
            <div
              className="bar"
              style={{
                height: `${Math.max(14, (g.count / max) * 110)}px`,
                background: BAR_COLOURS[i % BAR_COLOURS.length],
                animationDelay: `${i * 70}ms`,
              }}
            />
            <span className="bar-label">{g.plant}<br />{g.days === 0 ? 'today' : `in ${g.days}d`}</span>
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: '0.85rem', marginTop: 10 }}>
        Harvests expected in the next 30 days, counted from live plantings.
      </p>
    </div>
  );
}
