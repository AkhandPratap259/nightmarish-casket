// Data-driven visual: goals per matchweek, drawn from the league's real
// finished matches. Bar heights animate with a stepped ease when the data
// changes, and each bar is labelled for screen readers.
export default function GoalsChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="empty">No goals logged yet. The chart wakes up at the first goal.</p>;
  }
  const max = Math.max(...data.map((d) => d.goals), 1);
  return (
    <div className="chart" role="img" aria-label={data.map((d) => `Matchweek ${d.matchweek}: ${d.goals} goals in ${d.matches} matches`).join('. ')}>
      <div className="chart__bars">
        {data.map((d) => (
          <div className="chart__col" key={d.matchweek}>
            <span className="chart__value">{d.goals}</span>
            <div className="chart__bar" style={{ '--h': `${Math.max(8, Math.round((d.goals / max) * 100))}%` }}>
              <span className="chart__bar-fill" />
            </div>
            <span className="chart__label">MW{d.matchweek}</span>
            <span className="chart__sub">{d.matches} match{d.matches === 1 ? '' : 'es'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
