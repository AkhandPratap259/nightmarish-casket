import { useCallback, useEffect, useState } from 'react';
import { api, formatKg, formatDuration } from '../api.js';
import Dialog from '../components/Dialog.jsx';

export default function History({ go }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.mySessions({ status: 'completed', limit: 30 });
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openDetail(id) {
    try {
      const data = await api.getSession(id);
      setSelected(data.session);
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this session from your history?')) return;
    try {
      await api.deleteSession(id);
      setSelected(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="section">
      <p className="section-label">(05) Session history</p>
      <h1 className="section-title">
        What you <em>already did.</em>
      </h1>
      {error && (
        <p className="page-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="page-loading">Loading history…</p>
      ) : items.length === 0 ? (
        <p className="muted">
          No completed sessions yet. Start one from a template and finish it to see it here.
        </p>
      ) : (
        <ol className="history-list">
          {items.map((s, index) => (
            <li key={s._id} className="history-row reveal" style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}>
              <button type="button" className="history-row-btn" onClick={() => openDetail(s._id)}>
                <span className="history-date">
                  <strong>
                    {new Date(s.finishedAt || s.startedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </strong>
                  <span>
                    {new Date(s.finishedAt || s.startedAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
                <span className="history-main">
                  <strong>{s.name}</strong>
                  <span>
                    {s.exercises.length} exercise{s.exercises.length === 1 ? '' : 's'} ·{' '}
                    {formatKg(s.totalVolume)} · {formatDuration(s.durationSeconds)}
                  </span>
                </span>
                <span className="exercise-row-arrow" aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} labelledBy="history-detail-title">
        {selected && (
          <div className="dialog-body dialog-body--wide">
            <p className="section-label">
              {new Date(selected.finishedAt || selected.startedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <h2 id="history-detail-title">{selected.name}</h2>
            <p className="muted">
              {formatKg(selected.totalVolume)} · {formatDuration(selected.durationSeconds)}
            </p>
            {selected.exercises.map((ex) => (
              <div key={ex._id} className="history-exercise">
                <h3>{ex.exercise?.name || 'Exercise'}</h3>
                <ul>
                  {ex.sets.map((set, i) => (
                    <li key={set._id || i}>
                      Set {i + 1}: {set.reps} reps × {set.weight} kg
                      {set.completed === false ? ' (not completed)' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="dialog-actions">
              <button type="button" className="btn btn--danger" onClick={() => remove(selected._id)}>
                Delete session
              </button>
              <button type="button" className="btn btn--dark" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </section>
  );
}
