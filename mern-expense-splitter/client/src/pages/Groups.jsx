import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, asArray, formatMoney } from '../api';
import { CURRENCIES } from '../data/content';
import Dialog from '../components/Dialog';
import Reveal from '../components/Reveal';

export default function Groups({ user }) {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', currency: 'INR' });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

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
        One group per trip, flat, or household. Add members, log expenses, and let
        FairShare work out who owes whom.
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

      <ul className="ruled-list group-list">
        {groups.map((g, i) => (
          <Reveal key={g._id || g.id} delay={Math.min(i, 5) * 60}>
            <li className="tilt group-row">
              <Link className="group-row-link" to={`/groups/${g._id || g.id}`}>
                <span className="group-row-name">{g.name}</span>
                <span className="muted small">
                  {g.description || 'No description'}
                  {' · '}
                  {g.memberCount ?? (Array.isArray(g.members) ? g.members.length : 0)} members
                  {g.totalSpent != null ? ` · ${formatMoney(g.totalSpent, g.currency || 'INR')} spent` : ''}
                </span>
              </Link>
              <span className="group-row-currency">{g.currency || 'INR'}</span>
            </li>
          </Reveal>
        ))}
      </ul>

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
