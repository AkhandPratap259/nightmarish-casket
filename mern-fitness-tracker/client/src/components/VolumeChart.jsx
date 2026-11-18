// Animated SVG bar chart of weekly training volume (last 8 weeks).
// Bars grow on mount with a CSS transition; values are labelled in text so
// the chart is readable with animations disabled.
export default function VolumeChart({ weeks }) {
  const max = Math.max(1, ...weeks.map((w) => w.volume || 0));
  return (
    <div className="volume-chart" role="img" aria-label="Weekly training volume for the last 8 weeks">
      <div className="volume-chart-bars">
        {weeks.map((w) => {
          const height = Math.max(2, Math.round(((w.volume || 0) / max) * 100));
          const label = new Date(`${w.weekStart}T00:00:00`).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          });
          return (
            <div key={w.weekStart} className="volume-chart-col">
              <span className="volume-chart-value">{(w.volume || 0).toLocaleString('en-IN')}</span>
              <div
                className="volume-chart-bar"
                style={{ height: `${height}%` }}
                title={`${label}: ${(w.volume || 0).toLocaleString('en-IN')} kg across ${w.sessions} session${w.sessions === 1 ? '' : 's'}`}
              />
              <span className="volume-chart-label">{label}</span>
            </div>
          );
        })}
      </div>
      <p className="chart-note">Kilograms lifted per week · hover a bar for session count</p>
    </div>
  );
}
