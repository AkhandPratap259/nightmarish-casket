import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { MUSCLE_GROUPS, muscleLabel } from '../data/config.js';
import Dialog from '../components/Dialog.jsx';

export default function Exercises({ user }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [muscleGroup, setMuscleGroup] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', muscleGroup: 'chest', equipment: '', difficulty: 'beginner', instructions: '' });
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100 };
      if (muscleGroup) params.muscleGroup = muscleGroup;
      if (difficulty) params.difficulty = difficulty;
      if (q.trim()) params.q = q.trim();
      const data = await api.listExercises(params);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [muscleGroup, difficulty, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function addCustom(e) {
    e.preventDefault();
    setFormError('');
    try {
      await api.createExercise({
        ...form,
        instructions: form.instructions
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setShowAdd(false);
      setForm({ name: '', muscleGroup: 'chest', equipment: '', difficulty: 'beginner', instructions: '' });
      load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function removeCustom(id) {
    if (!window.confirm('Delete this custom exercise?')) return;
    try {
      await api.deleteExercise(id);
      setSelected(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="section">
      <p className="section-label">(02) Exercise library</p>
      <h1 className="section-title">
        Every lift, <em>on one shelf.</em>
      </h1>
      <p className="section-body">
        {total} exercise{total === 1 ? '' : 's'} in the library. Filter by muscle group or
        difficulty, open one for the full instructions, or add your own.
      </p>

      <div className="filter-bar" role="search">
        <div className="field field--inline">
          <label htmlFor="ex-q">Search</label>
          <input
            id="ex-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name"
          />
        </div>
        <div className="field field--inline">
          <label htmlFor="ex-muscle">Muscle group</label>
          <select id="ex-muscle" value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)}>
            <option value="">All groups</option>
            {MUSCLE_GROUPS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field field--inline">
          <label htmlFor="ex-diff">Difficulty</label>
          <select id="ex-diff" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="">Any level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        {user && (
          <button type="button" className="btn btn--primary" onClick={() => setShowAdd(true)}>
            Add custom exercise
          </button>
        )}
      </div>

      {error && (
        <p className="page-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="page-loading">Loading exercises…</p>
      ) : items.length === 0 ? (
        <p className="muted">No exercises match these filters.</p>
      ) : (
        <ul className="exercise-list">
          {items.map((ex, index) => (
            <li key={ex._id} className="exercise-row reveal" style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
              <button type="button" className="exercise-row-btn" onClick={() => setSelected(ex)}>
                <span className="exercise-row-num">{String(index + 1).padStart(2, '0')}</span>
                <span className="exercise-row-main">
                  <strong>{ex.name}</strong>
                  <span>
                    {muscleLabel(ex.muscleGroup)} · {ex.equipment} · {ex.difficulty}
                    {ex.isCustom ? ' · Custom' : ''}
                  </span>
                </span>
                <span className="exercise-row-arrow" aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} labelledBy="ex-detail-title">
        {selected && (
          <div className="dialog-body">
            <p className="section-label">{muscleLabel(selected.muscleGroup)} · {selected.equipment}</p>
            <h2 id="ex-detail-title">{selected.name}</h2>
            <p className="muted">Difficulty: {selected.difficulty}</p>
            {selected.instructions && selected.instructions.length > 0 ? (
              <ol className="instructions">
                {selected.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            ) : (
              <p className="muted">No written instructions for this exercise yet.</p>
            )}
            <div className="dialog-actions">
              {selected.isCustom && user && (
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => removeCustom(selected._id)}
                >
                  Delete custom exercise
                </button>
              )}
              <button type="button" className="btn btn--dark" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} labelledBy="ex-add-title">
        <form className="form dialog-body" onSubmit={addCustom}>
          <h2 id="ex-add-title">Add a custom exercise</h2>
          <div className="field">
            <label htmlFor="ex-add-name">Name</label>
            <input
              id="ex-add-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. Cable crossover"
            />
          </div>
          <div className="field">
            <label htmlFor="ex-add-muscle">Muscle group</label>
            <select
              id="ex-add-muscle"
              value={form.muscleGroup}
              onChange={(e) => setForm({ ...form, muscleGroup: e.target.value })}
            >
              {MUSCLE_GROUPS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ex-add-equipment">Equipment</label>
            <input
              id="ex-add-equipment"
              type="text"
              value={form.equipment}
              onChange={(e) => setForm({ ...form, equipment: e.target.value })}
              required
              placeholder="e.g. Cable machine"
            />
          </div>
          <div className="field">
            <label htmlFor="ex-add-diff">Difficulty</label>
            <select
              id="ex-add-diff"
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="ex-add-instructions">Instructions (one per line)</label>
            <textarea
              id="ex-add-instructions"
              rows={4}
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder={'Set the pulleys at chest height.\nStep forward into a split stance.'}
            />
          </div>
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <div className="dialog-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Save exercise
            </button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
