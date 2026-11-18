import { useEffect, useState } from 'react';
import { api, formatKg } from '../api.js';
import { muscleLabel } from '../data/config.js';

export default function Records({ go }) {
  const [records, setRecords] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([api.myRecords(), api.suggestions()])
      .then(([r, s]) => {
        if (!alive) return;
        setRecords(r.items || []);
        setSuggestions(s.items || []);
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <p className="page-loading">Loading your records…</p>;
  if (error) return <p className="page-error" role="alert">{error}</p>;

  return (
    <section className="section">
      <p className="section-label">(06) Personal records</p>
      <h1 className="section-title">
        Your best lifts, <em>on record.</em>
      </h1>
      <p className="section-body">
        A record is the heaviest single set you have logged for an exercise, with the
        estimated one-rep max from the Epley formula. Records update themselves when you
        finish a session — nothing here is typed in by hand.
      </p>

      {records.length === 0 ? (
        <p className="muted">
          No records yet. Finish a session with weighted sets and your first records will
          appear here.
        </p>
      ) : (
        <ol className="records-list">
          {records.map((r, index) => (
            <li key={r._id} className="record-row reveal" style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
              <span className="record-rank">{String(index + 1).padStart(2, '0')}</span>
              <span className="record-main">
                <strong>{r.exercise?.name || 'Exercise'}</strong>
                <span>
                  {muscleLabel(r.exercise?.muscleGroup)} · {r.exercise?.equipment || ''}
                </span>
              </span>
              <span className="record-numbers">
                <strong>{formatKg(r.bestWeight)} × {r.bestReps}</strong>
                <span>est. 1RM {formatKg(r.estimatedOneRepMax)}</span>
              </span>
              <span className="record-date">
                {new Date(r.achievedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </li>
          ))}
        </ol>
      )}

      <h2 className="section-subtitle">Next-session suggestions</h2>
      <p className="section-body">
        Progressive overload, computed from your records: your best weight plus about 2.5%,
        rounded to the nearest 2.5 kg plate. A suggestion is a starting point, not a
        prescription — adjust it to how you feel on the day.
      </p>
      {suggestions.length === 0 ? (
        <p className="muted">No suggestions until you have a record to build on.</p>
      ) : (
        <ul className="suggestion-list">
          {suggestions.map((s) => (
            <li key={s.exercise?._id} className="suggestion-row">
              <strong>{s.exercise?.name || 'Exercise'}</strong>
              <span>
                Best {formatKg(s.bestWeight)} × {s.bestReps} → try{' '}
                <strong className="accent-text">{formatKg(s.suggestedWeight)}</strong> next time
              </span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn btn--primary" onClick={() => go('templates')}>
        Plan the next session
      </button>
    </section>
  );
}
