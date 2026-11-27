// TaskTrove drop effect, retuned for FlowBoard: paper chips pop in at the
// drop point, drift upward and fade, then remove themselves on animation
// end. Fired when a Kanban card lands in a column. Event-driven, so it also
// plays on touch — only reduced motion hides it.
const CHIPS = [
  { glyph: '✦' },
  { glyph: '◍' },
  { glyph: 'ϟ' },
  { glyph: '⚙' },
  { glyph: '★' },
];

export default function DropBurst({ bursts, onDone }) {
  return (
    <div className="drop-burst-layer" aria-hidden="true">
      {bursts.map((b) => (
        <span key={b.id} className="drop-burst" style={{ left: b.x, top: b.y }}>
          {CHIPS.map((c, i) => (
            <span
              key={i}
              className="drop-chip"
              style={{ '--rot': `${(i * 7 - 14).toFixed(1)}deg`, '--dx': `${(i - 2) * 26}px`, animationDelay: `${i * 45}ms` }}
              onAnimationEnd={i === CHIPS.length - 1 ? () => onDone(b.id) : undefined}
            >
              <span className="drop-glyph">{c.glyph}</span>
              {i === 0 ? b.label : ''}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}
