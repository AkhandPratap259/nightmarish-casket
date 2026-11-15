import { useEffect, useState } from 'react';
import { api } from '../api';

function shuffled(arr, seed) {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Spaced-repetition review: due words are served one at a time as a
// multiple-choice question. Correct answers double the interval; wrong
// ones reset it to one day (the server applies the rule).
export default function Review({ onFinished, notify }) {
  const [due, setDue] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);

  useEffect(() => {
    api
      .reviewDue()
      .then((d) => {
        setDue(d.due);
        setTotal(d.total);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  async function startSession() {
    if (!due.length) return;
    setError('');
    try {
      // Distractors come from the same language's vocabulary bank.
      const codes = [...new Set(due.map((i) => i.languageCode))];
      const vocabByCode = {};
      for (const code of codes) {
        const det = await api.language(code);
        vocabByCode[code] = det.vocabulary;
      }
      setSession({ items: due, index: 0, correct: 0, vocabByCode, answered: null });
    } catch (err) {
      setError(err.message);
    }
  }

  async function answerCurrent(chosen) {
    if (!session || session.answered) return;
    const item = session.items[session.index];
    const correct = chosen === item.translation;
    setSession((s) => ({ ...s, answered: { chosen, correct } }));
    try {
      const res = await api.reviewAnswer(item._id, correct);
      if (res.newAchievements.length) {
        notify(`Badge earned: ${res.newAchievements.map((a) => a.title).join(', ')}`, 'success');
      }
      onFinished(res.user);
      setSession((s) => ({ ...s, correct: s.correct + (correct ? 1 : 0), xpEarned: (s.xpEarned || 0) + res.xpAwarded }));
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  function nextItem() {
    setSession((s) => {
      if (!s) return s;
      if (s.index + 1 >= s.items.length) return { ...s, done: true };
      return { ...s, index: s.index + 1, answered: null };
    });
  }

  if (loading) {
    return (
      <div className="page">
        <p aria-live="polite">Loading your review deck…</p>
      </div>
    );
  }

  if (session && !session.done) {
    const item = session.items[session.index];
    const vocab = session.vocabByCode[item.languageCode] || [];
    const distractors = shuffled(
      vocab.filter((w) => w.translation !== item.translation).map((w) => w.translation),
      session.index * 13 + 5
    ).slice(0, 3);
    const options = shuffled([item.translation, ...distractors], session.index * 7 + 3);
    return (
      <div className="page">
        <p className="section-label">(REVIEW) {session.index + 1} OF {session.items.length}</p>
        <h1>
          What does <em>“{item.word}”</em> mean?
        </h1>
        <p className="page-sub">Due from your lessons · interval {item.intervalDays} day{item.intervalDays > 1 ? 's' : ''}</p>
        <div className="options-list" role="group" aria-label="Answer options">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`option-btn ${
                session.answered
                  ? opt === item.translation
                    ? 'is-correct'
                    : opt === session.answered.chosen
                      ? 'is-wrong'
                      : ''
                  : ''
              }`}
              onClick={() => answerCurrent(opt)}
              disabled={Boolean(session.answered)}
            >
              {opt}
            </button>
          ))}
        </div>
        {session.answered ? (
          <div className={`feedback ${session.answered.correct ? 'is-correct' : 'is-wrong'}`} role="status">
            <p className="feedback-title">
              {session.answered.correct ? 'Correct! +5 XP' : `Not quite — “${item.word}” means “${item.translation}”.`}
            </p>
            <button type="button" className="btn btn-primary" onClick={nextItem}>
              {session.index + 1 >= session.items.length ? 'See results' : 'Next word'}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (session && session.done) {
    return (
      <div className="page">
        <p className="section-label">(REVIEW DONE)</p>
        <h1>
          Review complete. <em>{session.correct} of {session.items.length} right.</em>
        </h1>
        <p>Correct words move further into the future; the ones you missed come back tomorrow.</p>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Refresh the deck
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <p className="section-label">(REVIEW) SPACED REPETITION</p>
      <h1>
        Words you missed, <em>right on time.</em>
      </h1>
      <p className="page-sub">
        Every word you get wrong in a lesson lands here. Answer it right and the interval doubles
        (1 → 2 → 4 → 8 days); get it wrong and it comes back tomorrow.
      </p>
      {error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : null}
      <p className="review-counts" aria-live="polite">
        <strong>{due.length}</strong> due now · <strong>{total}</strong> words in your deck
      </p>
      {due.length ? (
        <>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={startSession}>
              Start review ({due.length} word{due.length > 1 ? 's' : ''})
            </button>
          </div>
          <ol className="review-list">
            {due.map((item) => (
              <li key={item._id}>
                <span className="review-word">{item.word}</span>
                <span className="review-meta">
                  {item.languageCode.toUpperCase()} · interval {item.intervalDays} day{item.intervalDays > 1 ? 's' : ''}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="empty-note">Nothing is due. Finish a lesson and get a word wrong, and it will show up here.</p>
      )}
    </div>
  );
}
