import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { speak, XP_PER_CORRECT } from '../data/config';
import HoldButton from './HoldButton';

// The lesson session player: hearts, XP, progress and four exercise types.
// Answers are sent to the server, which validates them and awards XP —
// the client never decides whether an answer is right.
export default function LessonPlayer({ lesson, speechLang, onExit, onFinished, notify }) {
  const exercises = lesson.exercises;
  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [xpEarned, setXpEarned] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fillValue, setFillValue] = useState('');
  const [fillError, setFillError] = useState('');
  // Matching state, reset per exercise.
  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);
  const [matched, setMatched] = useState([]);
  const [wrongPair, setWrongPair] = useState(null);
  const feedbackRef = useRef(null);

  const exercise = exercises[index];
  const isLast = index === exercises.length - 1;

  // Shuffle the match targets once per exercise so the answers are not in order.
  const shuffledB = useMemo(() => {
    if (!exercise || exercise.type !== 'match') return [];
    const arr = exercise.pairs.map((p) => p.b);
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = (i * 7 + 3) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [exercise]);

  useEffect(() => {
    setFillValue('');
    setFillError('');
    setSelectedA(null);
    setSelectedB(null);
    setMatched([]);
    setWrongPair(null);
  }, [index]);

  useEffect(() => {
    if (feedback && feedbackRef.current) feedbackRef.current.focus();
  }, [feedback]);

  function formatAnswer(answer) {
    if (Array.isArray(answer)) return answer.map((p) => `${p.a} = ${p.b}`).join(', ');
    return answer;
  }

  async function submit(answer) {
    if (submitting || feedback) return;
    setSubmitting(true);
    try {
      const res = await api.submitAnswer(lesson.id, index, answer);
      setHearts(res.hearts);
      setXpEarned(res.xpEarned);
      setFeedback({ correct: res.correct, correctAnswer: res.correctAnswer });
      if (res.leveledUp) notify(`Level up! You are now level ${res.user.level}.`, 'success');
      if (res.failed) setFailed(true);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function continueNext() {
    if (failed) return;
    if (!isLast) {
      setFeedback(null);
      setIndex((i) => i + 1);
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.completeLesson(lesson.id);
      setResult(res);
      onFinished(res.user);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function handleMatchClick(side, value) {
    if (feedback || submitting) return;
    if (side === 'a') {
      if (matched.some((m) => m.a === value)) return;
      setSelectedA(value);
      if (selectedB) pairUp(value, selectedB);
    } else {
      if (matched.some((m) => m.b === value)) return;
      setSelectedB(value);
      if (selectedA) pairUp(selectedA, value);
    }
  }

  function pairUp(a, b) {
    const correctPair = exercise.pairs.find((p) => p.a === a && p.b === b);
    if (correctPair) {
      setMatched((m) => [...m, { a, b }]);
      setSelectedA(null);
      setSelectedB(null);
    } else {
      setWrongPair({ a, b });
      window.setTimeout(() => {
        setWrongPair(null);
        setSelectedA(null);
        setSelectedB(null);
      }, 600);
    }
  }

  function submitFill(e) {
    e.preventDefault();
    if (!fillValue.trim()) {
      setFillError('Type an answer first.');
      return;
    }
    submit(fillValue.trim());
  }

  if (result) {
    return (
      <div className="lesson-result" role="status">
        <p className="section-label">(DONE) LESSON COMPLETE</p>
        <h2>
          {result.score === 100 ? 'Flawless. ' : 'Well done. '}
          <em>{lesson.title} finished.</em>
        </h2>
        <p className="result-score">
          Score <strong>{result.score}%</strong> · XP earned <strong>+{result.xpEarned}</strong>
        </p>
        <p>
          Level {result.user.level} · {result.user.xp} XP total · {result.user.streak}-day streak
          {result.firstTime ? '' : ' · (played again — smaller bonus)'}
        </p>
        {result.newAchievements.length ? (
          <div className="result-achievements">
            <p className="section-label">NEW BADGE{result.newAchievements.length > 1 ? 'S' : ''}</p>
            {result.newAchievements.map((a) => (
              <p key={a.key} className="achievement-new">★ {a.title}</p>
            ))}
          </div>
        ) : null}
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={onExit}>
            Back to the skill tree
          </button>
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="lesson-result" role="status">
        <p className="section-label">(OUT OF HEARTS)</p>
        <h2>
          No hearts left. <em>Try again.</em>
        </h2>
        <p>You got {index} of {exercises.length} exercises in. Wrong answers go into your review deck — a quick review, then retry the lesson.</p>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={onExit}>
            Back to the skill tree
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-player">
      <div className="lesson-hud">
        <button type="button" className="btn btn-ghost btn-small" onClick={onExit} aria-label="Exit lesson">
          ✕ Exit
        </button>
        <div className="lesson-progress" role="progressbar" aria-valuenow={index} aria-valuemin={0} aria-valuemax={exercises.length} aria-label="Lesson progress">
          <span style={{ width: `${(index / exercises.length) * 100}%` }} />
        </div>
        <div className="lesson-hearts" aria-label={`${hearts} hearts left`}>
          {[0, 1, 2].map((i) => (
            <span key={`${i}-${i < hearts}`} className={`heart ${i < hearts ? 'is-full' : 'is-lost'}`} aria-hidden="true">
              <svg width="26" height="24" viewBox="0 0 24 22">
                <path
                  d="M12 21s-8.5-5.6-8.5-11A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 3c0 5.4-8.5 11-8.5 11z"
                  strokeWidth="1.8"
                />
              </svg>
            </span>
          ))}
        </div>
        <span className="lesson-xp" aria-live="polite">+{xpEarned} XP</span>
      </div>

      <p className="section-label">
        EXERCISE {index + 1} OF {exercises.length} · {lesson.unitTitle.toUpperCase()}
      </p>
      <h2 key={index} className="lesson-question glitch-in">{exercise.prompt}</h2>

      {exercise.type === 'mc' || exercise.type === 'listen' ? (
        <div className="exercise-block">
          {exercise.type === 'listen' ? (
            <button
              type="button"
              className="btn btn-primary listen-btn"
              onClick={() => {
                if (!speak(exercise.audioText, speechLang)) notify('Your browser has no speech synthesis.', 'error');
              }}
              disabled={Boolean(feedback)}
            >
              🔊 Hear it
            </button>
          ) : null}
          {exercise.question ? <p className="exercise-word">{exercise.question}</p> : null}
          <div className="options-list" role="group" aria-label="Answer options">
            {exercise.options.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`option-btn ${feedback && feedback.correctAnswer === opt ? 'is-correct' : ''}`}
                onClick={() => submit(opt)}
                disabled={Boolean(feedback) || submitting}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {exercise.type === 'fill' ? (
        <form className="exercise-block" onSubmit={submitFill} noValidate>
          <label htmlFor="fill-answer">Your answer</label>
          <input
            id="fill-answer"
            type="text"
            value={fillValue}
            onChange={(e) => {
              setFillValue(e.target.value);
              setFillError('');
            }}
            disabled={Boolean(feedback)}
            autoComplete="off"
            aria-describedby={fillError ? 'fill-error' : undefined}
            aria-invalid={Boolean(fillError)}
          />
          {fillError ? (
            <p className="form-error" id="fill-error" role="alert">{fillError}</p>
          ) : null}
          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={Boolean(feedback) || submitting}>
              Check
            </button>
          </div>
          <p className="hint-text">The answer is checked on the server — accents are forgiven.</p>
        </form>
      ) : null}

      {exercise.type === 'match' ? (
        <div className="exercise-block">
          <div className="match-grid">
            <div className="match-col" role="group" aria-label="Words">
              {exercise.pairs.map((p) => {
                const isMatched = matched.some((m) => m.a === p.a);
                const isWrong = wrongPair && wrongPair.a === p.a;
                return (
                  <button
                    key={p.a}
                    type="button"
                    className={`match-tile ${selectedA === p.a ? 'is-selected' : ''} ${isMatched ? 'is-matched' : ''} ${isWrong ? 'is-wrong' : ''}`}
                    onClick={() => handleMatchClick('a', p.a)}
                    disabled={isMatched || Boolean(feedback)}
                    aria-pressed={selectedA === p.a}
                  >
                    {p.a}
                  </button>
                );
              })}
            </div>
            <div className="match-col" role="group" aria-label="Meanings">
              {shuffledB.map((b) => {
                const isMatched = matched.some((m) => m.b === b);
                const isWrong = wrongPair && wrongPair.b === b;
                return (
                  <button
                    key={b}
                    type="button"
                    className={`match-tile ${selectedB === b ? 'is-selected' : ''} ${isMatched ? 'is-matched' : ''} ${isWrong ? 'is-wrong' : ''}`}
                    onClick={() => handleMatchClick('b', b)}
                    disabled={isMatched || Boolean(feedback)}
                    aria-pressed={selectedB === b}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="hint-text">Tap a word, then its meaning. Match all {exercise.pairs.length} pairs, then check.</p>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={matched.length !== exercise.pairs.length || Boolean(feedback) || submitting}
              onClick={() => submit(matched)}
            >
              Check matches
            </button>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`feedback ${feedback.correct ? 'is-correct' : 'is-wrong'}`}
          role="status"
          tabIndex={-1}
          ref={feedbackRef}
        >
          <p className="feedback-title">
            {feedback.correct ? `Correct! +${XP_PER_CORRECT} XP` : 'Not quite.'}
          </p>
          {!feedback.correct ? (
            <p>
              The answer was: <strong>{formatAnswer(feedback.correctAnswer)}</strong>
            </p>
          ) : null}
          {isLast ? (
            <HoldButton
              className="btn-primary"
              onConfirm={continueNext}
              disabled={submitting}
              label="Hold to finish the lesson"
              hint="Press and hold to finish the lesson — it locks in your score."
            >
              Finish lesson
            </HoldButton>
          ) : (
            <button type="button" className="btn btn-primary" onClick={continueNext} disabled={submitting}>
              Continue
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
