import { useRef, useState } from 'react';
import Scramble from './Scramble';

// Card deck stack with swipe (B15, primary layout): lessons are a stack of
// cards under the synthwave sun. Swipe (pointer drag), arrow keys or the
// buttons move through the deck; the top card is the one you can start.
// Only the top card and the two peeking behind it are in the DOM.
export default function CardDeck({ lessons, startIndex = 0, onStart }) {
  const [current, setCurrent] = useState(() => Math.max(0, Math.min(startIndex, lessons.length - 1)));
  const [drag, setDrag] = useState({ dx: 0, dragging: false });
  const startX = useRef(0);
  const dxRef = useRef(0);
  const dragging = useRef(false);

  if (!lessons.length) return null;

  function goTo(next) {
    setCurrent(Math.max(0, Math.min(next, lessons.length - 1)));
    setDrag({ dx: 0, dragging: false });
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    // Never capture a drag that starts on an interactive element — the
    // Start button inside the top card must keep its click.
    if (e.target.closest('button, a, input, select, textarea')) return;
    dragging.current = true;
    startX.current = e.clientX;
    dxRef.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging.current) return;
    dxRef.current = e.clientX - startX.current;
    setDrag({ dx: dxRef.current, dragging: true });
  }

  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    const dx = dxRef.current;
    dxRef.current = 0;
    setDrag({ dx: 0, dragging: false });
    if (dx < -70 && current < lessons.length - 1) goTo(current + 1);
    else if (dx > 70 && current > 0) goTo(current - 1);
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(current - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(current + 1);
    }
  }

  const visible = lessons
    .map((lesson, i) => ({ lesson, offset: i - current }))
    .filter(({ offset }) => offset >= 0 && offset <= 2);
  const top = lessons[current];

  return (
    <div className="deck">
      <div
        className="deck-viewport"
        role="group"
        aria-roledescription="carousel"
        aria-label={`Lesson deck — card ${current + 1} of ${lessons.length}: ${top.title}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {visible.map(({ lesson, offset }) => {
          const isTop = offset === 0;
          const style = {
            zIndex: 10 - offset,
            transform: isTop
              ? `translateX(${drag.dx}px) rotate(${drag.dx * 0.03}deg)`
              : `translateY(${-offset * 16}px) scale(${1 - offset * 0.05})`,
            opacity: 1 - offset * 0.22,
            pointerEvents: isTop ? 'auto' : 'none',
            transition: drag.dragging ? 'none' : 'transform 260ms steps(5, end), opacity 260ms steps(5, end)',
          };
          return (
            <article
              key={lesson.id}
              className={`deck-card ${isTop ? 'is-top glitch-in' : ''} ${lesson.status === 'locked' ? 'is-locked-card' : ''}`}
              style={style}
            >
              <div>
                <p className="deck-kicker">
                  Unit {lesson.unit} · {lesson.unitTitle} · Lesson {lesson.order}
                </p>
                <h3 className="deck-title">
                  {isTop ? <Scramble key={lesson.id} text={lesson.title} /> : lesson.title}
                </h3>
                <p className="deck-desc">{lesson.description}</p>
              </div>
              <div>
                <div className="deck-meta">
                  <span className="deck-chip">{lesson.exerciseCount} exercises</span>
                  <span className="deck-chip is-amber">+{lesson.xpReward} XP</span>
                  {lesson.status === 'completed' ? (
                    <span className="deck-chip is-pink">
                      ✓ Done{lesson.bestScore ? ` · best ${lesson.bestScore}%` : ''}
                    </span>
                  ) : lesson.status === 'unlocked' ? (
                    <span className="deck-chip">Open — ready to play</span>
                  ) : (
                    <span className="deck-chip">🔒 Locked</span>
                  )}
                </div>
                <div className="deck-foot">
                  {lesson.status === 'locked' ? (
                    <span className="deck-lock-note">Finish the previous lesson to unlock this card.</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      tabIndex={isTop ? 0 : -1}
                      onClick={() => onStart(lesson.id)}
                    >
                      {lesson.status === 'completed' ? 'Play again →' : 'Start lesson →'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="deck-nav">
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          aria-label="Previous lesson card"
        >
          ← Prev
        </button>
        <div className="deck-dots" role="group" aria-label="Choose a lesson card">
          {lessons.map((l, i) => (
            <button
              key={l.id}
              type="button"
              className={i === current ? 'is-current' : ''}
              onClick={() => goTo(i)}
              aria-label={`Card ${i + 1}: ${l.title}`}
              aria-current={i === current ? 'true' : undefined}
            />
          ))}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => goTo(current + 1)}
          disabled={current === lessons.length - 1}
          aria-label="Next lesson card"
        >
          Next →
        </button>
        <span className="deck-counter" aria-live="polite">
          {current + 1} / {lessons.length}
        </span>
        <span className="deck-hint">Swipe, drag or use ← → keys to flip through the deck.</span>
      </div>
    </div>
  );
}
