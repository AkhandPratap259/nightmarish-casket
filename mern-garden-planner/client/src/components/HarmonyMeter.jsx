// Bed harmony meter: 0-100 score from the companion-planting engine.
export default function HarmonyMeter({ score, label }) {
  if (score == null) {
    return (
      <div>
        <p className="muted" style={{ margin: '4px 0' }}>{label || 'Empty bed — sow the first plant to start a harmony score.'}</p>
      </div>
    );
  }
  const band = score < 50 ? 'low' : score < 75 ? 'mid' : '';
  const word = score < 50 ? 'Clashing' : score < 75 ? 'Getting along' : 'Thriving together';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong>Bed harmony</strong>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', lineHeight: 1 }}>
          {score} <small style={{ fontFamily: 'Karla, sans-serif', fontSize: '0.85rem', fontWeight: 800 }}>{word}</small>
        </span>
      </div>
      <div className={`meter ${band}`} role="img" aria-label={`Bed harmony score ${score} out of 100 — ${word}`}>
        <i style={{ width: `${score}%` }} />
      </div>
      <div className="meter-labels">
        <span>0 · clashing</span>
        <span>50 · neutral</span>
        <span>100 · thriving</span>
      </div>
    </div>
  );
}
