import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { SPORTS, CLAY_COLOURS } from '../data/config';

export default function CreateLeague({ user }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', sport: 'Football', season: '2026–27', city: '', description: '', colour: 'pink', pointsWin: 3, pointsDraw: 1 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <div className="page">
        <h1>Start a league</h1>
        <p className="empty">Sign in first — leagues belong to an organizer account.</p>
        <Link className="btn btn--primary" to="/auth">Sign in</Link>
      </div>
    );
  }
  if (user.role !== 'organizer' && user.role !== 'admin') {
    return (
      <div className="page">
        <h1>Start a league</h1>
        <p className="empty">Only organizer accounts can create leagues. Your account is a {user.role} — register a new organizer account or ask an organizer to add you.</p>
        <Link className="btn btn--primary" to="/leagues">Browse leagues</Link>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.createLeague(form);
      navigate(`/leagues/${res.league.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page form-page">
      <p><Link className="back-link" to="/leagues">← All leagues</Link></p>
      <h1>Start a league</h1>
      <p className="page-head__lead">Set the basics now — teams and fixtures come next, on the league page.</p>
      <form onSubmit={handleSubmit} className="form-card">
        {error && <p className="error" role="alert">{error}</p>}
        <label>League name
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={90} placeholder="e.g. Sunday Football League" />
        </label>
        <div className="form-row">
          <label>Sport
            <select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })}>
              {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>Season
            <input required value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} maxLength={40} />
          </label>
        </div>
        <label>City / area
          <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={60} placeholder="e.g. Azamgarh" />
        </label>
        <label>About the league
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={600} placeholder="Where do you play, and who is it for?" />
        </label>
        <label>Clay colour
          <select value={form.colour} onChange={(e) => setForm({ ...form, colour: e.target.value })}>
            {Object.entries(CLAY_COLOURS).map(([key, c]) => <option key={key} value={key}>{c.label}</option>)}
          </select>
        </label>
        <div className="form-row">
          <label>Points for a win
            <input type="number" min="1" max="5" value={form.pointsWin} onChange={(e) => setForm({ ...form, pointsWin: Number(e.target.value) })} />
          </label>
          <label>Points for a draw
            <input type="number" min="0" max="2" value={form.pointsDraw} onChange={(e) => setForm({ ...form, pointsDraw: Number(e.target.value) })} />
          </label>
        </div>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Creating…' : 'Create league'}</button>
      </form>
    </div>
  );
}
