// Animated skill tree: lessons hang on a winding path, alternating sides
// as the learner descends. Locked lessons are muted and unclickable;
// completed ones carry a check; the next open lesson pulses gently.
export default function SkillTree({ units, onStart }) {
  let globalIndex = 0;
  return (
    <div className="skill-tree" aria-label="Skill tree">
      {units.map((unit) => (
        <section key={unit.unit} className="tree-unit" aria-label={`Unit ${unit.unit}: ${unit.title}`}>
          <p className="section-label">(0{unit.unit}) UNIT {unit.unit} — {unit.title.toUpperCase()}</p>
          <ol className="tree-path">
            {unit.lessons.map((lesson) => {
              const idx = globalIndex;
              globalIndex += 1;
              const side = idx % 2 === 0 ? 'is-left' : 'is-right';
              const stateClass =
                lesson.status === 'completed' ? 'is-done' : lesson.status === 'unlocked' ? 'is-open' : 'is-locked';
              return (
                <li key={lesson.id} className={`tree-node ${side} ${stateClass}`}>
                  <button
                    type="button"
                    className="tree-bubble"
                    disabled={lesson.status === 'locked'}
                    onClick={() => onStart(lesson.id)}
                    aria-label={
                      lesson.status === 'locked'
                        ? `${lesson.title} — locked, complete the previous lesson first`
                        : lesson.status === 'completed'
                          ? `${lesson.title} — completed, play again`
                          : `${lesson.title} — start lesson`
                    }
                  >
                    <span className="tree-bubble-mark" aria-hidden="true">
                      {lesson.status === 'completed' ? '✓' : lesson.status === 'locked' ? '🔒' : idx + 1}
                    </span>
                  </button>
                  <div className="tree-node-text">
                    <span className="tree-node-title">{lesson.title}</span>
                    <span className="tree-node-meta">
                      {lesson.exerciseCount} exercises · +{lesson.xpReward} XP
                      {lesson.status === 'completed' && lesson.bestScore ? ` · best ${lesson.bestScore}%` : ''}
                    </span>
                    <span className="tree-node-desc">{lesson.description}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
