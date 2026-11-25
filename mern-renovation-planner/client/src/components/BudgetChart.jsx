// Data-driven SVG cost-breakdown chart, animated on change.
export default function BudgetChart({ data, totalBudget }) {
  if (!data || data.length === 0) {
    return <div className="state-box"><p>No cost data yet. Add tasks or take-off lines to see the breakdown.</p></div>;
  }
  const max = Math.max(...data.map(d => Math.max(d.estimated, d.actual)), 1);
  return (
    <div role="img" aria-label="Cost breakdown by category">
      {data.map((d) => (
        <div key={d.category} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9rem' }}>
            <span>{d.category}</span>
            <span>₹{d.estimated.toLocaleString('en-IN')} est. / ₹{d.actual.toLocaleString('en-IN')} actual</span>
          </div>
          <div style={{ border: '2px solid #111', background: '#fff', height: 22, marginTop: 4 }}>
            <div className="chart-bar" style={{ width: `${(d.estimated / max) * 100}%`, height: '100%', background: '#FFD400', borderRight: '2px solid #111' }} />
          </div>
          <div style={{ border: '2px solid #111', borderTop: 0, background: '#fff', height: 14 }}>
            <div className="chart-bar" style={{ width: `${(d.actual / max) * 100}%`, height: '100%', background: '#2E6BFF' }} />
          </div>
        </div>
      ))}
      <p style={{ fontSize: '0.9rem', marginTop: 8 }}>
        <span style={{ background: '#FFD400', border: '2px solid #111', padding: '0 6px' }}>Estimated</span>{' '}
        <span style={{ background: '#2E6BFF', color: '#fff', border: '2px solid #111', padding: '0 6px' }}>Actual</span>{' '}
        Total budget ₹{totalBudget?.toLocaleString('en-IN')}
      </p>
    </div>
  );
}
