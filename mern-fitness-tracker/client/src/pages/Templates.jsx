import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { MUSCLE_GROUPS, muscleLabel } from '../data/config.js';
import Dialog from '../components/Dialog.jsx';

export default function Templates({ user, go }) {
  const [templates, setTemplates] = useState([]);
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([]);
  const [isPublic, setIsPublic] = useState(false);
  const [pickMuscle, setPickMuscle] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, lib] = await Promise.all([
        api.listTemplates(false),
        api.listExercises({ limit: 100 }),
      ]);
      setTemplates(t.items || []);
      setLibrary(lib.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName('');
    setDescription('');
    setItems([]);
    setIsPublic(false);
    setShowCreate(true);
  }

  function openEdit(template) {
    setEditing(template);
    setName(template.name);
    setDescription(template.description || '');
    setItems(
      (template.items || []).map((it) => ({
        _id: it._id,
        exercise: it.exercise?._id || it.exercise,
        exerciseName: it.exercise?.name || 'Exercise',
        muscleGroup: it.exercise?.muscleGroup || '',
        targetSets: it.targetSets,
        targetReps: it.targetReps,
        targetWeight: it.targetWeight,
        order: it.order ?? 0,
        notes: it.notes || '',
      }))
    );
    setIsPublic(Boolean(template.isPublic));
    setShowCreate(true);
  }

  function addExercise(ex) {
    setItems((prev) => [
      ...prev,
      {
        exercise: ex._id,
        exerciseName: ex.name,
        muscleGroup: ex.muscleGroup,
        targetSets: 3,
        targetReps: 10,
        targetWeight: 0,
        order: prev.length,
        notes: '',
      },
    ]);
  }

  function updateItem(index, patch) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function moveItem(index, direction) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((it, i) => ({ ...it, order: i }));
    });
  }

  function onDragStart(index) {
    setDragIndex(index);
  }

  function onDrop(index) {
    if (dragIndex === null || dragIndex === index) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next.map((it, i) => ({ ...it, order: i }));
    });
    setDragIndex(null);
  }

  async function saveTemplate(e) {
    e.preventDefault();
    if (items.length === 0) {
      setStatus('Add at least one exercise before saving.');
      return;
    }
    setStatus('');
    try {
      const body = {
        name,
        description,
        isPublic,
        items: items.map((it, i) => ({
          exercise: it.exercise,
          targetSets: it.targetSets,
          targetReps: it.targetReps,
          targetWeight: it.targetWeight,
          order: i,
          notes: it.notes,
        })),
      };
      if (editing) {
        await api.updateTemplate(editing._id, body);
        setStatus(`Template “${name}” saved.`);
      } else {
        await api.createTemplate(body);
        setStatus(`Template “${name}” created.`);
      }
      setShowCreate(false);
      load();
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function startWorkout(template) {
    try {
      const { session } = await api.startSession({ templateId: template._id });
      go('session', session._id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function duplicate(template) {
    try {
      await api.duplicateTemplate(template._id);
      setStatus(`Duplicated “${template.name}” into your templates.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(template) {
    if (!window.confirm(`Delete the template “${template.name}”?`)) return;
    try {
      await api.deleteTemplate(template._id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const pickable = library.filter((ex) =>
    pickMuscle ? ex.muscleGroup === pickMuscle : true
  );

  return (
    <section className="section">
      <p className="section-label">(03) Workout templates</p>
      <h1 className="section-title">
        Plan the work, <em>then lift it.</em>
      </h1>
      <p className="section-body">
        A template is a reusable workout: exercises in order, with target sets, reps and
        weight. Drag rows to reorder, or use the arrow buttons — the order is saved on the
        server.
      </p>
      {status && (
        <p className="status-note" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="page-error" role="alert">
          {error}
        </p>
      )}
      <div className="section-actions">
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          New template
        </button>
      </div>
      {loading ? (
        <p className="page-loading">Loading templates…</p>
      ) : templates.length === 0 ? (
        <p className="muted">No templates yet — create your first one.</p>
      ) : (
        <ul className="template-list">
          {templates.map((t) => (
            <li key={t._id} className="template-card">
              <div className="template-card-head">
                <h2>{t.name}</h2>
                {t.isPublic && <span className="tag">Public</span>}
                {t.isSample && <span className="tag tag--muted">Sample</span>}
              </div>
              {t.description && <p className="muted">{t.description}</p>}
              <ol className="template-items">
                {(t.items || []).map((it) => (
                  <li key={it._id || it.exercise?._id}>
                    {it.exercise?.name || 'Exercise'} — {it.targetSets} × {it.targetReps}
                    {it.targetWeight ? ` @ ${it.targetWeight} kg` : ' (bodyweight)'}
                  </li>
                ))}
              </ol>
              <div className="template-actions">
                <button type="button" className="btn btn--primary" onClick={() => startWorkout(t)}>
                  Start workout
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => openEdit(t)}>
                  Edit
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => duplicate(t)}>
                  Duplicate
                </button>
                <button type="button" className="btn btn--danger-ghost" onClick={() => remove(t)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        labelledBy="template-dialog-title"
      >
        <form className="form dialog-body dialog-body--wide" onSubmit={saveTemplate}>
          <h2 id="template-dialog-title">{editing ? 'Edit template' : 'New template'}</h2>
          <div className="field">
            <label htmlFor="tpl-name">Template name</label>
            <input
              id="tpl-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Push Day"
            />
          </div>
          <div className="field">
            <label htmlFor="tpl-desc">Description</label>
            <input
              id="tpl-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this session is for"
            />
          </div>

          <h3>Exercises in order</h3>
          <p className="muted">
            Drag a row to move it, or use the ↑ ↓ buttons. The order is saved with the template.
          </p>
          {items.length === 0 ? (
            <p className="muted">No exercises yet — add some from the picker below.</p>
          ) : (
            <ol className="builder-list">
              {items.map((it, index) => (
                <li
                  key={it._id || `${it.exercise}-${index}`}
                  className={`builder-row ${dragIndex === index ? 'builder-row--dragging' : ''}`}
                  draggable
                  onDragStart={() => onDragStart(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(index)}
                >
                  <span className="builder-drag" aria-hidden="true" title="Drag to reorder">
                    ⋮⋮
                  </span>
                  <span className="builder-name">
                    <strong>
                      {index + 1}. {it.exerciseName}
                    </strong>
                    <span>{muscleLabel(it.muscleGroup)}</span>
                  </span>
                  <label className="builder-num">
                    Sets
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={it.targetSets}
                      onChange={(e) =>
                        updateItem(index, { targetSets: parseInt(e.target.value, 10) || 1 })
                      }
                    />
                  </label>
                  <label className="builder-num">
                    Reps
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={it.targetReps}
                      onChange={(e) =>
                        updateItem(index, { targetReps: parseInt(e.target.value, 10) || 1 })
                      }
                    />
                  </label>
                  <label className="builder-num">
                    Weight (kg)
                    <input
                      type="number"
                      min="0"
                      step="2.5"
                      value={it.targetWeight}
                      onChange={(e) =>
                        updateItem(index, { targetWeight: Number(e.target.value) || 0 })
                      }
                    />
                  </label>
                  <span className="builder-move">
                    <button
                      type="button"
                      aria-label={`Move ${it.exerciseName} up`}
                      disabled={index === 0}
                      onClick={() => moveItem(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${it.exerciseName} down`}
                      disabled={index === items.length - 1}
                      onClick={() => moveItem(index, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${it.exerciseName}`}
                      onClick={() =>
                        setItems((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          )}

          <h3>Add an exercise</h3>
          <div className="field field--inline">
            <label htmlFor="tpl-pick-muscle">Filter by muscle group</label>
            <select
              id="tpl-pick-muscle"
              value={pickMuscle}
              onChange={(e) => setPickMuscle(e.target.value)}
            >
              <option value="">All groups</option>
              {MUSCLE_GROUPS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <ul className="picker-list">
            {pickable.slice(0, 12).map((ex) => (
              <li key={ex._id}>
                <button type="button" className="picker-item" onClick={() => addExercise(ex)}>
                  <strong>{ex.name}</strong>
                  <span>
                    {muscleLabel(ex.muscleGroup)} · {ex.equipment}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <label className="check-row">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Make this template public (other members can start it and duplicate it)
          </label>

          <div className="dialog-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              {editing ? 'Save changes' : 'Create template'}
            </button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
