import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import SeedShape from '../components/SeedShape';

const STAGES = ['sown', 'sprouted', 'growing', 'ready'];

function StageStrip({ stage }) {
  const idx = STAGES.indexOf(stage);
  return (
    <div className="stage-strip" role="img" aria-label={`Growth stage: ${stage}`}>
      {STAGES.map((s, i) => (
        <span key={s} className={i < idx ? 'on' : i === idx ? 'current' : ''}>{s}</span>
      ))}
    </div>
  );
}

export default function Dashboard({ user, toast }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sideWidth, setSideWidth] = useState(300);
  const [newGarden, setNewGarden] = useState({ name: '', location: '' });
  const [creating, setCreating] = useState(false);
  const dividerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.myDashboard();
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load your dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function startResize(e) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sideWidth;
    function move(ev) {
      setSideWidth(Math.max(240, Math.min(420, startW + (ev.clientX - startX))));
    }
    function up() {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }

  async function createGarden(e) {
    e.preventDefault();
    if (!newGarden.name.trim()) return;
    setCreating(true);
    try {
      await api.createGarden(newGarden);
      setNewGarden({ name: '', location: '' });
      toast('Garden created — now add beds on its orbit map.', 'success');
      load();
    } catch (err) {
      toast(err.message || 'Could not create the garden', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function water(id) {
    try {
      await api.waterPlanting(id);
      toast('Watered — the next watering date moved on.', 'success');
      load();
    } catch (err) {
      toast(err.message || 'Could not water that planting', 'error');
    }
  }

  async function toggleTask(task) {
    try {
      await api.updateTask(task._id, { status: task.status === 'done' ? 'open' : 'done' });
      load();
    } catch (err) {
      toast(err.message || 'Could not update the task', 'error');
    }
  }

  if (loading) {
    return (
      <div className="wrap page">
        <div className="skeleton" aria-label="Loading dashboard"><div className="bar" style={{ width: '40%' }} /><div className="bar" style={{ width: '70%' }} /><div className="bar" style={{ width: '55%' }} /></div>
      </div>
    );
  }
  if (error) {
    return <div className="wrap page"><p className="status error" role="alert">{error}</p></div>;
  }

  const gardens = data.gardens || [];
  const myPlantings = data.myPlantings || [];
  const myTasks = data.myTasks || [];

  return (
    <div className="wrap page">
      <span className="eyebrow blue">Dashboard</span>
      <h1 style={{ fontSize: '3rem' }}>Hello, {user?.name?.split(' ')[0] || 'gardener'}</h1>
      <p className="lede">Your beds, your plantings, your watering list — one workspace.</p>

      <div className="workspace" style={{ '--side-w': `${sideWidth}px`, marginTop: 24 }}>
        <aside className="workspace-side" aria-label="My gardens">
          <h2 style={{ fontSize: '1.6rem', marginBottom: 12 }}>My gardens</h2>
          {gardens.length === 0 ? (
            <div className="empty">
              <p><strong>No gardens yet.</strong></p>
              <p className="muted">Create one below, then add beds to its orbit map.</p>
            </div>
          ) : (
            gardens.map((g) => (
              <Link key={g._id} to={`/gardens/${g._id}`} className="card hoverable" style={{ display: 'block', textDecoration: 'none', color: 'inherit', marginBottom: 12, padding: 14 }}>
                <strong style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.04em' }}>{g.name}</strong>
                <div className="muted" style={{ fontSize: '0.88rem' }}>{g.location || 'No location set'} · {g.rings} orbit ring{g.rings > 1 ? 's' : ''}</div>
              </Link>
            ))
          )}
          <form onSubmit={createGarden} style={{ marginTop: 18 }}>
            <h3 style={{ marginBottom: 10 }}>New garden</h3>
            <div className="field">
              <label htmlFor="garden-name">Garden name <span className="req" aria-hidden="true">*</span></label>
              <input id="garden-name" required value={newGarden.name} onChange={(e) => setNewGarden({ ...newGarden, name: e.target.value })} placeholder="e.g. Sunrise Community Garden" />
            </div>
            <div className="field">
              <label htmlFor="garden-location">Location</label>
              <input id="garden-location" value={newGarden.location} onChange={(e) => setNewGarden({ ...newGarden, location: e.target.value })} placeholder="e.g. Azamgarh, UP" />
            </div>
            <button className="btn primary block" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create garden'}</button>
          </form>
          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            <span className="pill blue">{data.plantCount} plants in library</span>
            <span className="pill yellow">{data.bedCount} beds</span>
          </div>
        </aside>
        <div
          className="workspace-divider"
          ref={dividerRef}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          tabIndex={0}
          onPointerDown={startResize}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setSideWidth((w) => Math.max(240, w - 20));
            if (e.key === 'ArrowRight') setSideWidth((w) => Math.min(420, w + 20));
          }}
        />
        <div className="workspace-main">
          <h2 style={{ fontSize: '1.8rem', marginBottom: 4 }}>My plantings</h2>
          <p className="muted" style={{ marginTop: 0 }}>Growth stage and watering are computed from each sowing date.</p>
          {myPlantings.length === 0 ? (
            <div className="empty"><p><strong>Nothing sown yet.</strong></p><p className="muted">Open a garden, pick a seed packet and throw it onto a bed.</p></div>
          ) : (
            <div className="grid cols-2">
              {myPlantings.map((p) => (
                <article key={p._id} className="card hoverable">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <SeedShape shape={p.plant?.shape} colour={p.plant?.colour} label={p.plant?.name} />
                    <div style={{ minWidth: 0 }}>
                      <h3>{p.plant?.name} ×{p.quantity}</h3>
                      <p className="muted" style={{ margin: '2px 0 8px', fontSize: '0.9rem' }}>
                        {p.bed?.garden?.name} · {p.bed?.name}
                      </p>
                    </div>
                  </div>
                  <StageStrip stage={p.stage} />
                  <p style={{ margin: '10px 0', fontWeight: 700, fontSize: '0.92rem' }}>
                    {p.daysUntilHarvest === 0 ? 'Ready to harvest' : `${p.daysUntilHarvest} day${p.daysUntilHarvest === 1 ? '' : 's'} to harvest`}
                    {p.wateringDue && <span className="pill red" style={{ marginLeft: 8 }}>Needs water</span>}
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Link className="btn small" to={`/plantings/${p._id}`}>Details</Link>
                    <button className="btn small blue" type="button" onClick={() => water(p._id)} disabled={!['sown', 'sprouted', 'growing', 'ready'].includes(p.status)}>Water now</button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <h2 style={{ fontSize: '1.8rem', margin: '28px 0 10px' }}>Due tasks</h2>
          {myTasks.length === 0 ? (
            <p className="muted">No open tasks assigned to you. Enjoy the quiet beds.</p>
          ) : (
            myTasks.map((t) => (
              <div key={t._id} className={`task-row${new Date(t.dueDate) < new Date() ? ' overdue' : ''}`}>
                <button
                  className={`check-btn${t.status === 'done' ? ' done' : ''}`}
                  type="button"
                  onClick={() => toggleTask(t)}
                  aria-label={t.status === 'done' ? `Reopen task: ${t.title}` : `Mark done: ${t.title}`}
                >
                  {t.status === 'done' ? '✓' : ''}
                </button>
                <div className="task-body">
                  <div className="task-title">{t.title}</div>
                  <div className="muted" style={{ fontSize: '0.88rem' }}>
                    {t.kind} · {t.bed?.name || ''} · due {new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
