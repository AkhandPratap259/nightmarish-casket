import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getUser } from '../api';
import Modal from '../components/Modal';

const STATUSES = ['planning', 'in-progress', 'on-hold', 'completed'];
const TYPES = ['1BHK Flat', '2BHK Flat', '3BHK Flat', 'Independent House', 'Villa', 'Shop', 'Office', 'Other'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', propertyType: '2BHK Flat', address: '', totalBudget: '', startDate: '', targetDate: '', status: 'planning' });
  const [formError, setFormError] = useState('');
  const user = getUser();

  async function load() {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([api.get('/dashboard'), api.get('/projects')]);
      setStats(s.data); setProjects(p.data);
    } catch (e) { setError('Could not load your dashboard. Try refreshing the page.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function createProject(e) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Give the project a name.'); return; }
    if (!form.totalBudget || Number(form.totalBudget) <= 0) { setFormError('Enter a total budget greater than ₹0.'); return; }
    try {
      await api.post('/projects', { ...form, totalBudget: Number(form.totalBudget) });
      setShowForm(false);
      setForm({ name: '', propertyType: '2BHK Flat', address: '', totalBudget: '', startDate: '', targetDate: '', status: 'planning' });
      load();
    } catch (err) { setFormError(err.response?.data?.message || 'Could not create the project.'); }
  }

  async function deleteProject(id, name) {
    if (!window.confirm(`Delete "${name}" and all its rooms, tasks and take-offs? This cannot be undone.`)) return;
    await api.delete(`/projects/${id}`);
    load();
  }

  if (loading) return (
    <div className="container page">
      <div className="skeleton" style={{ width: '40%' }} /><div className="skeleton" /><div className="skeleton" /><div className="skeleton" style={{ width: '70%' }} />
      <p aria-live="polite">Loading your projects…</p>
    </div>
  );
  if (error) return <div className="container page"><div className="state-box" role="alert"><h2>Something went wrong</h2><p>{error}</p><button className="btn" onClick={load}>Try again</button></div></div>;

  const filtered = status ? projects.filter(p => p.status === status) : projects;

  return (
    <div className="container page ink-bleed">
      <p className="kicker">Namaste, {user?.name || 'homeowner'}</p>
      <h1>Your renovation dashboard</h1>
      <div className="stat-strip">
        <div className="stat"><b>{stats?.projectCount ?? 0}</b>Projects</div>
        <div className="stat"><b>₹{(stats?.totalBudget || 0).toLocaleString('en-IN')}</b>Total budget</div>
        <div className="stat"><b>{stats?.taskCounts?.done ?? 0} / {(stats?.taskCounts?.todo || 0) + (stats?.taskCounts?.doing || 0) + (stats?.taskCounts?.done || 0)}</b>Tasks done</div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
        <label htmlFor="status-filter" style={{ fontWeight: 700 }}>Filter by status</label>
        <select id="status-filter" value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: '10px 12px', border: '3px solid #111', minHeight: 48 }}>
          <option value="">All projects</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New project</button>
      </div>

      {filtered.length === 0 ? (
        <div className="state-box">
          <h2>No projects yet</h2>
          <p>Create your first renovation project — a kitchen remodel, a bathroom refresh, a whole-house makeover.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>Create your first project</button>
        </div>
      ) : (
        <div className="grid grid-3">
          {filtered.map((p) => (
            <article key={p._id} className="card wobble">
              <span className="tag tag-yellow">{p.status}</span>{' '}
              {p.isSample && <span className="tag">Sample project</span>}
              <h3 style={{ marginTop: 10 }}><Link to={`/projects/${p._id}`} style={{ color: 'inherit' }}>{p.name}</Link></h3>
              <p style={{ fontSize: '0.9rem' }}>{p.propertyType}{p.address ? ` · ${p.address}` : ''}</p>
              <p><strong>₹{(p.totalBudget || 0).toLocaleString('en-IN')}</strong> budget</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to={`/projects/${p._id}`} className="btn btn-sm">Open plan</Link>
                <button className="btn btn-ghost btn-sm" onClick={() => deleteProject(p._id, p.name)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {stats?.upcomingTasks?.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2>Next due tasks</h2>
          <ul className="activity-feed">
            {stats.upcomingTasks.map(t => (
              <li key={t._id}><strong>{t.title}</strong> — {t.project?.name} · due {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN') : 'no date'} · ₹{(t.estimatedCost || 0).toLocaleString('en-IN')}</li>
            ))}
          </ul>
        </section>
      )}

      {showForm && (
        <Modal title="New renovation project" onClose={() => setShowForm(false)}>
          {formError && <div className="form-error" role="alert">{formError}</div>}
          <form onSubmit={createProject}>
            <div className="field"><label htmlFor="p-name">Project name</label><input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kitchen Remodel — 2BHK Flat" required /></div>
            <div className="form-row">
              <div className="field"><label htmlFor="p-type">Property type</label><select id="p-type" value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div className="field"><label htmlFor="p-budget">Total budget (₹)</label><input id="p-budget" type="number" min="1" value={form.totalBudget} onChange={(e) => setForm({ ...form, totalBudget: e.target.value })} required /></div>
            </div>
            <div className="field"><label htmlFor="p-address">Address</label><input id="p-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="form-row">
              <div className="field"><label htmlFor="p-start">Start date</label><input id="p-start" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div className="field"><label htmlFor="p-target">Target date</label><input id="p-target" type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} /></div>
            </div>
            <button className="btn btn-primary" type="submit">Create project</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
