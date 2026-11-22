import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, asArray, formatMoney } from '../api';
import { CURRENCIES } from '../data/content';
import Dialog from '../components/Dialog';
import TiltCard from '../components/TiltCard';
import Reveal from '../components/Reveal';

export default function Groups({ user }) {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', currency: 'INR' });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const railRef = useRef(null);
  const dragRef = useRef({ down: false, startX: 0, startScroll: 0 });

  async function load() {
    setLoading(true);
    try {
      const data = await api.listGroups();
      setGroups(asArray(data, 'groups'));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) load();
    else setLoading(false);
  }, [user]);

  async function createGroup(e) {
    e.preventDefault();
    setFormError('');
    setBusy(true);
    try {
      await api.createGroup(form);
      setDialogOpen(false);
      setForm({ name: '', description: '', currency: 'INR' });
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function scrollRail(dir) {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: dir * Math.min(380, rail.clientWidth * 0.8), behavior: 'smooth' });
  }

  // Drag-to-scroll on the rail (fine pointers); touch scrolls natively.
  function onPointerDown(e) {
    if (e.pointerType !== 'mouse') return;
    dragRef.current = { down: true, startX: e.clientX, startScroll: railRef.current?.scrollLeft || 0 };
  }
  function onPointerMove(e) {
    const drag = dragRef.current;
    const rail = railRef.current;
    if (!drag.down || !rail) return;
    rail.scrollLeft = drag.startScroll - (e.clientX - drag.startX);
  }
  function endDrag() {
    dragRef.current.down = false;
  }

  if (!user) {
    return (
      <main className="page">
        <h1 className="page-title">Sign in to see your <em>groups</em></h1>
        <p className="page-sub">Groups are where expenses live — one group per trip, flat, or household.</p>
        <p>
          <Link className="btn btn-primary" to="/login">Sign in</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="page">
      <p className="section-label">(01) Groups</p>
      <div className="section-head-row">
        <h1 className="page-title">Your <em>groups</em></h1>
        <button type="button" className="btn btn-primary" onClick={() => setDialogOpen(true)}>
          + New group
        </button>
      </div>
      <p className="page-sub">
        One group per trip, flat, or household. Each group is an edition of your
        ledger — swipe or scroll the rail to browse them, open one to read its expenses.
      </p>

      {loading && <p className="muted" role="status">Loading groups…</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && groups.length === 0 && (
        <p className="empty-state">
          No groups yet. Create one to start splitting expenses with friends, flatmates,
          or travel companions.
        </p>
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="rail-wrap">
          <div
            ref={railRef}
            className="rail"
            role="region"
            aria-label="Your groups, as a horizontal rail of editions"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
          >
            {groups.map((g, i) => (
              <TiltCard
                key={g._id || g.id}
                to={`/groups/${g._id || g.id}`}
                className="rail-card"
                aria-label={`${g.name}, ${g.memberCount ?? (Array.isArray(g.members) ? g.members.length : 0)} members${g.totalSpent != null ? `, ${formatMoney(g.totalSpent, g.currency || 'INR')} spent` : ''}`}
              >
                <span className="rail-card-masthead">
                  <strong>Edition {String(i + 1).padStart(2, '0')}</strong>
                  <span>{g.currency || 'INR'}</span>
                </span>
                <span className="rail-card-halftone" aria-hidden="true" />
                <span className="rail-card-body">
                  <span className="rail-card-name tilt-layer">{g.name}</span>
                  <span className="rail-card-desc">{g.description || 'No description'}</span>
                </span>
                <span className="rail-card-foot">
                  <span>
                    {g.memberCount ?? (Array.isArray(g.members) ? g.members.length : 0)} members
                    {g.expenseCount != null ? ` · ${g.expenseCount} expenses` : ''}
                  </span>
                  {g.totalSpent != null && <strong>{formatMoney(g.totalSpent, g.currency || 'INR')}</strong>}
                </span>
              </TiltCard>
            ))}
          </div>
          <div className="rail-nav">
            <button type="button" className="btn btn-ghost btn-small" onClick={() => scrollRail(-1)} aria-label="Scroll rail backwards">
              ← Earlier
            </button>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => scrollRail(1)} aria-label="Scroll rail forwards">
              Later →
            </button>
          </div>
          <p className="rail-hint">Drag the rail, or use the buttons — swipe on touch.</p>
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Create a group">
        <form className="form" onSubmit={createGroup} noValidate>
          <label className="field">
            <span>Group name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Goa trip, Flat 4B, Weekend house…"
            />
          </label>
          <label className="field">
            <span>Description (optional)</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Currency</span>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <div className="dialog-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create group'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}
