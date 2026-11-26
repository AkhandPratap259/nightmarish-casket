import { useEffect, useState } from 'react';
import { api } from '../api';

const KINDS = ['water', 'weed', 'harvest', 'feed', 'prune', 'other'];

export default function Tasks({ user, toast }) {
  const [gardens, setGardens] = useState([]);
  const [gardenId, setGardenId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [mineOnly, setMineOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ kind: 'water', title: '', dueDate: '' });

  useEffect(() => {
    api.listGardens()
      .then((res) => {
        const gs = res.gardens || [];
        setGardens(gs);
        if (gs.length > 0) setGardenId(gs[0]._id);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Could not load your gardens');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!gardenId) return;
    api.listTasks(gardenId, { status: 'all', mine: mineOnly ? 'true' : undefined })
      .then((res) => setTasks(res.tasks || []))
      .catch((err) => setError(err.message || 'Could not load tasks'));
  }, [gardenId, mineOnly]);

  async function toggle(task) {
    try {
      await api.updateTask(task._id, { status: task.status === 'done' ? 'open' : 'done' });
      setTasks((ts) => ts.map((t) => (t._id === task._id ? { ...t, status: t.status === 'done' ? 'open' : 'done' } : t)));
    } catch (err) {
      toast(err.message || 'Could not update the task', 'error');
    }
  }

  async function create(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.dueDate) return;
    try {
      const res = await api.createTask(gardenId, { ...form, assignee: user?.id });
      setTasks((ts) => [...ts, res.task].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
      setForm({ kind: 'water', title: '', dueDate: '' });
      toast('Task added.', 'success');
    } catch (err) {
      toast(err.message || 'Could not add the task', 'error');
    }
  }

  async function remove(task) {
    try {
      await api.deleteTask(task._id);
      setTasks((ts) => ts.filter((t) => t._id !== task._id));
    } catch (err) {
      toast(err.message || 'Could not delete the task', 'error');
    }
  }

  if (loading) {
    return (
      <div className="wrap page">
        <div className="skeleton" aria-label="Loading tasks"><div className="bar" style={{ width: '40%' }} /><div className="bar" style={{ width: '70%' }} /></div>
      </div>
    );
  }

  const openTasks = tasks.filter((t) => t.status === 'open');
  const doneTasks = tasks.filter((t) => t.status !== 'open');

  return (
    <div className="wrap page">
      <span className="eyebrow blue">Garden tasks</span>
      <h1 style={{ fontSize: '3rem' }}>What needs doing</h1>
      {error && <p className="status error" role="alert">{error}</p>}
      {gardens.length === 0 ? (
        <div className="empty"><p><strong>No gardens yet.</strong></p><p className="muted">Create a garden from your dashboard — tasks live inside gardens.</p></div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', margin: '18px 0' }}>
            <div className="field" style={{ margin: 0, minWidth: 220 }}>
              <label htmlFor="task-garden">Garden</label>
              <select id="task-garden" value={gardenId} onChange={(e) => setGardenId(e.target.value)}>
                {gardens.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
            </div>
            <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontWeight: 800, minHeight: 44 }}>
              <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} style={{ width: 20, height: 20 }} />
              Only mine
            </label>
          </div>

          <form onSubmit={create} className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.6rem', marginBottom: 12 }}>Add a task</h2>
            <div className="form-row">
              <div className="field">
                <label htmlFor="task-kind">Kind</label>
                <select id="task-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="task-due">Due date <span className="req" aria-hidden="true">*</span></label>
                <input id="task-due" type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="task-title">Task <span className="req" aria-hidden="true">*</span></label>
              <input id="task-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Turn the compost in Bed B2" />
            </div>
            <button className="btn primary" type="submit">Add task</button>
          </form>

          <h2 style={{ fontSize: '1.8rem', marginBottom: 10 }}>Open · {openTasks.length}</h2>
          {openTasks.length === 0 ? (
            <p className="muted">Nothing open — the garden is quiet.</p>
          ) : (
            openTasks.map((t) => (
              <div key={t._id} className={`task-row${new Date(t.dueDate) < new Date() ? ' overdue' : ''}`}>
                <button
                  className="check-btn"
                  type="button"
                  onClick={() => toggle(t)}
                  aria-label={`Mark done: ${t.title}`}
                />
                <div className="task-body">
                  <div className="task-title">{t.title}</div>
                  <div className="muted" style={{ fontSize: '0.88rem' }}>
                    {t.kind} · {t.bed?.name || ''} · due {new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {t.assignee ? ` · ${t.assignee.name}` : ''}
                  </div>
                </div>
                <button className="btn small ghost" type="button" onClick={() => remove(t)}>Delete</button>
              </div>
            ))
          )}

          {doneTasks.length > 0 && (
            <>
              <h2 style={{ fontSize: '1.8rem', margin: '24px 0 10px' }}>Done · {doneTasks.length}</h2>
              {doneTasks.map((t) => (
                <div key={t._id} className="task-row done">
                  <button className="check-btn done" type="button" onClick={() => toggle(t)} aria-label={`Reopen task: ${t.title}`}>✓</button>
                  <div className="task-body">
                    <div className="task-title">{t.title}</div>
                    <div className="muted" style={{ fontSize: '0.88rem' }}>{t.kind} · {t.bed?.name || ''}</div>
                  </div>
                  <button className="btn small ghost" type="button" onClick={() => remove(t)}>Delete</button>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
