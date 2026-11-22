import { useCallback, useEffect, useRef, useState } from 'react';
import { api, formatKg, formatDuration } from '../api.js';
import RestTimer from '../components/RestTimer.jsx';
import VolumeRing from '../components/VolumeRing.jsx';
import Marquee from '../components/Marquee.jsx';
import Dialog from '../components/Dialog.jsx';

export default function Session({ sessionId, go }) {
  const [session, setSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [library, setLibrary] = useState([]);
  const [drafts, setDrafts] = useState({});
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getSession(sessionId);
      setSession(data.session);
    } catch (err) {
      setError(err.message);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
    api.listExercises({ limit: 100 }).then((d) => setLibrary(d.items || [])).catch(() => {});
  }, [load]);

  useEffect(() => {
    if (!session || session.status !== 'active') return;
    const start = new Date(session.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [session?.status, session?.startedAt]);

  function draftKey(exIndex, setIndex) {
    return `${exIndex}:${setIndex}`;
  }

  function draftFor(exIndex, setIndex, set) {
    const key = draftKey(exIndex, setIndex);
    return drafts[key] || { reps: set.reps, weight: set.weight };
  }

  async function saveSet(exIndex, setIndex) {
    const ex = session.exercises[exIndex];
    const set = ex.sets[setIndex];
    const draft = draftFor(exIndex, setIndex, set);
    setSaving(true);
    try {
      const data = await api.logSet(session._id, {
        exerciseIndex: exIndex,
        setIndex,
        reps: draft.reps,
        weight: draft.weight,
        completed: true,
      });
      setSession(data.session);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[draftKey(exIndex, setIndex)];
        return next;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addSet(exIndex) {
    const ex = session.exercises[exIndex];
    const last = ex.sets[ex.sets.length - 1];
    setSaving(true);
    try {
      const data = await api.logSet(session._id, {
        exerciseIndex: exIndex,
        reps: last ? last.reps : 10,
        weight: last ? last.weight : 0,
        completed: false,
      });
      setSession(data.session);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeSet(exIndex, setIndex) {
    setSaving(true);
    try {
      const data = await api.deleteSet(session._id, { exerciseIndex: exIndex, setIndex });
      setSession(data.session);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addExercise(ex) {
    setSaving(true);
    try {
      const data = await api.addExerciseToSession(session._id, {
        exerciseId: ex._id,
        targetSets: 3,
        targetReps: 10,
        targetWeight: 0,
      });
      setSession(data.session);
      setShowAdd(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (!window.confirm('Finish this session? Completed sets are locked in.')) return;
    setSaving(true);
    try {
      const data = await api.finishSession(session._id);
      setSession(data.session);
      setFinished(data);
      clearInterval(timerRef.current);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function discard() {
    if (!window.confirm('Discard this session? It will be deleted.')) return;
    try {
      await api.deleteSession(session._id);
      go('history');
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !session) return <p className="page-error" role="alert">{error}</p>;
  if (!session) return <p className="page-loading">Loading session…</p>;

  const plannedVolume = session.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets.reduce((s, set) => s + (Number(set.reps) || 0) * (Number(set.weight) || 0), 0),
    0
  );
  const doneSets = session.exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.completed).length,
    0
  );
  const totalSets = session.exercises.reduce((n, ex) => n + ex.sets.length, 0);

  return (
    <section className="section session-page">
      <p className="section-label">(04) Live session</p>
      <div className="session-head">
        <h1 className="section-title">{session.name}</h1>
        <p className="session-meta" aria-live="polite">
          {session.status === 'active' ? (
            <>
              <span className="live-dot" aria-hidden="true" /> Live · {formatDuration(elapsed)} ·{' '}
              {doneSets}/{totalSets} sets done
            </>
          ) : (
            <>Finished · {formatDuration(session.durationSeconds)}</>
          )}
        </p>
      </div>
      <Marquee
        label="Live session stats"
        items={[
          session.status === 'active' ? `Live · ${formatDuration(elapsed)}` : `Finished · ${formatDuration(session.durationSeconds)}`,
          `${doneSets}/${totalSets} sets done`,
          `${formatKg(session.totalVolume)} lifted so far`,
          `${session.exercises.length} exercise${session.exercises.length === 1 ? '' : 's'} in this session`,
        ]}
      />
      {error && (
        <p className="page-error" role="alert">
          {error}
        </p>
      )}

      <div className="session-split">
        <div className="session-main">
          {session.exercises.map((ex, exIndex) => (
            <article key={ex._id} className="session-exercise">
              <div className="session-exercise-head">
                <h2>
                  {exIndex + 1}. {ex.exercise?.name || 'Exercise'}
                </h2>
                <span className="muted">{ex.exercise?.muscleGroup || ''}</span>
              </div>
              <ol className="set-list">
                {ex.sets.map((set, setIndex) => {
                  const draft = draftFor(exIndex, setIndex, set);
                  const isDone = set.completed;
                  return (
                    <li key={set._id || setIndex} className={`set-row ${isDone ? 'set-row--done' : ''}`}>
                      <span className="set-num">Set {setIndex + 1}</span>
                      <label>
                        Reps
                        <input
                          type="number"
                          min="0"
                          max="500"
                          value={draft.reps}
                          disabled={session.status !== 'active'}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [draftKey(exIndex, setIndex)]: {
                                ...draft,
                                reps: parseInt(e.target.value, 10) || 0,
                              },
                            }))
                          }
                        />
                      </label>
                      <label>
                        Weight (kg)
                        <input
                          type="number"
                          min="0"
                          max="2000"
                          step="2.5"
                          value={draft.weight}
                          disabled={session.status !== 'active'}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [draftKey(exIndex, setIndex)]: {
                                ...draft,
                                weight: Number(e.target.value) || 0,
                              },
                            }))
                          }
                        />
                      </label>
                      {session.status === 'active' && (
                        <span className="set-actions">
                          <button
                            type="button"
                            className={isDone ? 'btn btn--ghost' : 'btn btn--primary'}
                            onClick={() => saveSet(exIndex, setIndex)}
                            disabled={saving}
                          >
                            {isDone ? 'Update' : 'Log set'}
                          </button>
                          <button
                            type="button"
                            className="btn btn--danger-ghost"
                            onClick={() => removeSet(exIndex, setIndex)}
                            disabled={saving}
                            aria-label={`Remove set ${setIndex + 1} of ${ex.exercise?.name || 'exercise'}`}
                          >
                            ✕
                          </button>
                        </span>
                      )}
                      {isDone && <span className="set-check" aria-label="Logged">✓</span>}
                    </li>
                  );
                })}
              </ol>
              {session.status === 'active' && (
                <button type="button" className="btn btn--ghost" onClick={() => addSet(exIndex)} disabled={saving}>
                  + Add a set
                </button>
              )}
            </article>
          ))}
          {session.status === 'active' && (
            <button type="button" className="btn btn--ghost" onClick={() => setShowAdd(true)}>
              + Add an exercise to this session
            </button>
          )}
        </div>

        <aside className="session-side">
          <VolumeRing
            value={session.totalVolume}
            target={Math.max(plannedVolume, session.totalVolume, 1)}
            label="volume logged"
          />
          <p className="volume-total">
            <strong>{formatKg(session.totalVolume)}</strong> lifted so far
          </p>
          {session.status === 'active' && <RestTimer />}
          {session.status === 'active' && (
            <div className="session-finish">
              <button type="button" className="btn btn--primary btn--full" onClick={finish} disabled={saving}>
                Finish session
              </button>
              <button type="button" className="btn btn--danger-ghost btn--full" onClick={discard} disabled={saving}>
                Discard session
              </button>
            </div>
          )}
          {session.status === 'completed' && (
            <button type="button" className="btn btn--primary btn--full" onClick={() => go('history')}>
              Back to history
            </button>
          )}
        </aside>
      </div>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} labelledBy="add-ex-title">
        <div className="dialog-body">
          <h2 id="add-ex-title">Add an exercise</h2>
          <ul className="picker-list">
            {library.slice(0, 15).map((ex) => (
              <li key={ex._id}>
                <button type="button" className="picker-item" onClick={() => addExercise(ex)}>
                  <strong>{ex.name}</strong>
                  <span>
                    {ex.muscleGroup} · {ex.equipment}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="dialog-actions">
            <button type="button" className="btn btn--dark" onClick={() => setShowAdd(false)}>
              Close
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(finished)}
        onClose={() => {
          setFinished(null);
          go('history');
        }}
        labelledBy="finish-title"
      >
        {finished && (
          <div className="dialog-body finish-dialog">
            <p className="section-label">Session complete</p>
            <h2 id="finish-title">
              {finished.session.name} — <em>done.</em>
            </h2>
            <p>
              {formatKg(finished.session.totalVolume)} lifted in{' '}
              {formatDuration(finished.session.durationSeconds)}.
            </p>
            {finished.newRecords && finished.newRecords.length > 0 ? (
              <div className="pr-celebration">
                <h3>New personal records</h3>
                <ul>
                  {finished.newRecords.map((r) => (
                    <li key={r.exercise}>
                      <strong>{r.exercise}</strong> — {r.bestWeight} kg × {r.bestReps} (est. 1RM{' '}
                      {r.estimatedOneRepMax} kg)
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="muted">No new personal records this time — the bar will still be there next session.</p>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  setFinished(null);
                  go('records');
                }}
              >
                See my records
              </button>
              <button
                type="button"
                className="btn btn--dark"
                onClick={() => {
                  setFinished(null);
                  go('history');
                }}
              >
                Back to history
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </section>
  );
}
