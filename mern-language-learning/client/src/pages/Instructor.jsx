import { useEffect, useState } from 'react';
import { api } from '../api';
import Dialog from '../components/Dialog';
import HoldButton from '../components/HoldButton';
import Scramble from '../components/Scramble';

// Instructor studio: create, edit and delete lessons. Exercises are built
// row by row — type, prompt, question, options (comma-separated) or pairs
// (a=b, comma-separated), and the correct answer.
const EMPTY_EXERCISE = { type: 'mc', prompt: '', question: '', options: '', pairs: '', answer: '' };

function exerciseFromRow(row) {
  const ex = { type: row.type, prompt: row.prompt.trim(), question: row.question.trim(), answer: row.answer.trim() };
  if (row.type === 'mc' || row.type === 'listen') {
    ex.options = row.options.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (row.type === 'match') {
    ex.pairs = row.pairs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [a, b] = s.split('=').map((x) => x.trim());
        return { a: a || '', b: b || '' };
      });
  }
  if (row.type === 'listen') ex.audioText = row.question.trim();
  return ex;
}

function rowFromExercise(ex) {
  return {
    type: ex.type,
    prompt: ex.prompt || '',
    question: ex.question || '',
    options: (ex.options || []).join(', '),
    pairs: (ex.pairs || []).map((p) => `${p.a}=${p.b}`).join(', '),
    answer: ex.answer || '',
  };
}

export default function Instructor({ user, notify }) {
  const [languages, setLanguages] = useState([]);
  const [language, setLanguage] = useState('es');
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState(1);
  const [unitTitle, setUnitTitle] = useState('First words');
  const [order, setOrder] = useState(1);
  const [description, setDescription] = useState('');
  const [xpReward, setXpReward] = useState(20);
  const [rows, setRows] = useState([{ ...EMPTY_EXERCISE }]);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    api
      .languages()
      .then((d) => setLanguages(d.languages))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .lessons({ language })
      .then((d) => {
        setLessons(d.lessons);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [language]);

  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    return (
      <div className="page">
        <p className="section-label">(INSTRUCTOR STUDIO)</p>
        <h1>
          Instructors only, <em>this way.</em>
        </h1>
        <p>Sign in with the demo instructor account to create and edit lessons.</p>
      </div>
    );
  }

  function openCreate() {
    setEditing(null);
    setTitle('');
    setUnit(1);
    setUnitTitle('First words');
    setOrder((lessons.length || 0) + 1);
    setDescription('');
    setXpReward(20);
    setRows([{ ...EMPTY_EXERCISE }]);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(lesson) {
    setEditing(lesson);
    setTitle(lesson.title);
    setUnit(lesson.unit);
    setUnitTitle(lesson.unitTitle);
    setOrder(lesson.order);
    setDescription(lesson.description || '');
    setXpReward(lesson.xpReward);
    setRows(lesson.exercises.map(rowFromExercise));
    setFormError('');
    setFormOpen(true);
  }

  function updateRow(i, patch) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function saveLesson(e) {
    e.preventDefault();
    setFormError('');
    if (!title.trim()) {
      setFormError('A lesson title is required.');
      return;
    }
    const exercises = rows.map(exerciseFromRow);
    for (const ex of exercises) {
      if (!ex.prompt || !ex.answer) {
        setFormError('Every exercise needs a prompt and a correct answer.');
        return;
      }
      if ((ex.type === 'mc' || ex.type === 'listen') && (!ex.options || ex.options.length < 2)) {
        setFormError('Multiple-choice and listening exercises need at least 2 options.');
        return;
      }
      if (ex.type === 'match' && (!ex.pairs || ex.pairs.length < 2)) {
        setFormError('Matching exercises need at least 2 pairs, written as word=meaning.');
        return;
      }
    }
    const payload = {
      languageCode: language,
      unit: Number(unit),
      unitTitle: unitTitle.trim() || `Unit ${unit}`,
      order: Number(order),
      title: title.trim(),
      description: description.trim(),
      xpReward: Number(xpReward) || 20,
      exercises,
    };
    try {
      if (editing) {
        await api.updateLesson(editing.id, payload);
        notify('Lesson updated.', 'success');
      } else {
        await api.createLesson(payload);
        notify('Lesson created.', 'success');
      }
      setFormOpen(false);
      const d = await api.lessons({ language });
      setLessons(d.lessons);
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function removeLesson(lesson) {
    // Hold-to-confirm replaces the window.confirm — the hold IS the check.
    try {
      await api.deleteLesson(lesson.id);
      setLessons((ls) => ls.filter((l) => l.id !== lesson.id));
      notify('Lesson deleted.', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  return (
    <div className="page">
      <p className="section-label">(INSTRUCTOR STUDIO)</p>
      <h1>
        Build lessons, <em><Scramble text="shape the tree." /></em>
      </h1>
      <p className="page-sub">
        Lessons you create appear in the skill tree in unit, then order. Answers are stored on the
        server and never shown to learners.
      </p>
      {error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : null}
      <div className="lang-tabs" role="group" aria-label="Choose a language">
        {languages.map((l) => (
          <button
            key={l.code}
            type="button"
            className={l.code === language ? 'is-active' : ''}
            onClick={() => setLanguage(l.code)}
            aria-pressed={l.code === language}
          >
            {l.name}
          </button>
        ))}
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + New lesson
        </button>
      </div>
      {loading ? (
        <p aria-live="polite">Loading lessons…</p>
      ) : (
        <ol className="instructor-list">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <span className="inst-title">
                Unit {lesson.unit} · {lesson.order} — {lesson.title}
              </span>
              <span className="inst-meta">
                {lesson.exercises.length} exercises · +{lesson.xpReward} XP · {lesson.status}
              </span>
              <span className="inst-actions">
                <button type="button" className="btn btn-ghost btn-small" onClick={() => openEdit(lesson)}>
                  Edit
                </button>
                <HoldButton
                  className="btn-ghost btn-small"
                  onConfirm={() => removeLesson(lesson)}
                  label={`Hold to delete ${lesson.title}`}
                >
                  Delete
                </HoldButton>
              </span>
            </li>
          ))}
        </ol>
      )}

      {formOpen ? (
        <Dialog title={editing ? 'Edit lesson' : 'New lesson'} onClose={() => setFormOpen(false)}>
          <form className="lesson-form" onSubmit={saveLesson} noValidate>
            <div className="field">
              <label htmlFor="lf-title">Lesson title</label>
              <input id="lf-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-grid-3">
              <div className="field">
                <label htmlFor="lf-unit">Unit</label>
                <input id="lf-unit" type="number" min="1" value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="lf-unit-title">Unit title</label>
                <input id="lf-unit-title" value={unitTitle} onChange={(e) => setUnitTitle(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="lf-order">Order in unit</label>
                <input id="lf-order" type="number" min="1" value={order} onChange={(e) => setOrder(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="lf-desc">Description</label>
              <input id="lf-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="lf-xp">XP reward on completion</label>
              <input id="lf-xp" type="number" min="0" value={xpReward} onChange={(e) => setXpReward(e.target.value)} />
            </div>
            <p className="section-label">(EXERCISES)</p>
            {rows.map((row, i) => (
              <fieldset key={i} className="exercise-row">
                <legend>Exercise {i + 1}</legend>
                <div className="field">
                  <label htmlFor={`ex-type-${i}`}>Type</label>
                  <select id={`ex-type-${i}`} value={row.type} onChange={(e) => updateRow(i, { type: e.target.value })}>
                    <option value="mc">Multiple choice</option>
                    <option value="fill">Fill in the blank (type the answer)</option>
                    <option value="match">Matching pairs</option>
                    <option value="listen">Listening (spoken word)</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`ex-prompt-${i}`}>Prompt (shown to the learner)</label>
                  <input id={`ex-prompt-${i}`} value={row.prompt} onChange={(e) => updateRow(i, { prompt: e.target.value })} placeholder="e.g. What does “Hola” mean?" />
                </div>
                <div className="field">
                  <label htmlFor={`ex-q-${i}`}>Question / word</label>
                  <input id={`ex-q-${i}`} value={row.question} onChange={(e) => updateRow(i, { question: e.target.value })} placeholder="e.g. Hola" />
                </div>
                {row.type === 'mc' || row.type === 'listen' ? (
                  <div className="field">
                    <label htmlFor={`ex-opt-${i}`}>Options (comma-separated, include the answer)</label>
                    <input id={`ex-opt-${i}`} value={row.options} onChange={(e) => updateRow(i, { options: e.target.value })} placeholder="Hello, Goodbye, Please, Thank you" />
                  </div>
                ) : null}
                {row.type === 'match' ? (
                  <div className="field">
                    <label htmlFor={`ex-pairs-${i}`}>Pairs (word=meaning, comma-separated)</label>
                    <input id={`ex-pairs-${i}`} value={row.pairs} onChange={(e) => updateRow(i, { pairs: e.target.value })} placeholder="Hola=Hello, Gracias=Thank you" />
                  </div>
                ) : null}
                <div className="field">
                  <label htmlFor={`ex-ans-${i}`}>Correct answer</label>
                  <input id={`ex-ans-${i}`} value={row.answer} onChange={(e) => updateRow(i, { answer: e.target.value })} placeholder="e.g. Hello" />
                </div>
                {rows.length > 1 ? (
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>
                    Remove exercise
                  </button>
                ) : null}
              </fieldset>
            ))}
            <button type="button" className="btn btn-ghost" onClick={() => setRows((rs) => [...rs, { ...EMPTY_EXERCISE }])}>
              + Add exercise
            </button>
            {formError ? (
              <p className="form-error" role="alert">{formError}</p>
            ) : null}
            <div className="btn-row">
              <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editing ? 'Save changes' : 'Create lesson'}
              </button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </div>
  );
}
