import { useCallback, useEffect, useState } from 'react';
import { api, formatKg } from '../api.js';
import Dialog from '../components/Dialog.jsx';
import VolumeRing from '../components/VolumeRing.jsx';

export default function Challenges({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [leaderboard, setLeaderboard] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'sessions',
    target: 3,
    unit: 'sessions',
    startsAt: '',
    endsAt: '',
  });

  const canCreate = user && (user.role === 'trainer' || user.role === 'admin');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listChallenges();
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function join(id) {
    try {
      await api.joinChallenge(id);
      setStatus('You joined the challenge — your sessions now count toward it.');
      load();
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function openLeaderboard(challenge) {
    try {
      const data = await api.challengeLeaderboard(challenge._id);
      setLeaderboard(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function create(e) {
    e.preventDefault();
    try {
      await api.createChallenge({
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      });
      setShowCreate(false);
      setStatus('Challenge created.');
      load();
    } catch (err) {
      setStatus(err.message);
    }
  }

  function unitFor(type) {
    if (type === 'volume') return 'kg';
    if (type === 'sessions') return 'sessions';
    return 'days';
  }

  return (
    <section className="section">
      <p className="section-label">(08) Challenges</p>
      <h1 className="section-title">
        A target, <em>a deadline.</em>
      </h1>
      <p className="section-body">
        Challenges count what you actually do: completed sessions, kilograms lifted, or
        distinct training days inside the challenge window. Join one and your finished
        sessions update it automatically.
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
      {canCreate && (
        <div className="section-actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              const now = new Date();
              const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              const toInput = (d) => d.toISOString().slice(0, 16);
              setForm((f) => ({ ...f, startsAt: toInput(now), endsAt: toInput(end) }));
              setShowCreate(true);
            }}
          >
            New challenge
          </button>
        </div>
      )}
      {loading ? (
        <p className="page-loading">Loading challenges…</p>
      ) : items.length === 0 ? (
        <p className="muted">No open challenges right now.</p>
      ) : (
        <ul className="challenge-list">
          {items.map((c) => {
            const mine = c.myProgress;
            const progress = mine ? mine.progress || 0 : 0;
            const joined = Boolean(mine);
            const completed = Boolean(mine?.completedAt);
            const ends = new Date(c.endsAt);
            return (
              <li key={c._id} className="challenge-card">
                <div className="challenge-card-main">
                  <h2>{c.title}</h2>
                  <p className="muted">{c.description}</p>
                  <p className="challenge-meta">
                    {c.type === 'volume' ? 'Total volume' : c.type === 'sessions' ? 'Sessions' : 'Training days'} ·{' '}
                    target {c.type === 'volume' ? formatKg(c.target) : `${c.target} ${c.unit}`} · ends{' '}
                    {ends.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                  <div className="challenge-actions">
                    {joined ? (
                      <span className="tag">{completed ? 'Completed ✓' : 'Joined'}</span>
                    ) : (
                      <button type="button" className="btn btn--primary" onClick={() => join(c._id)}>
                        Join challenge
                      </button>
                    )}
                    <button type="button" className="btn btn--ghost" onClick={() => openLeaderboard(c)}>
                      Leaderboard
                    </button>
                  </div>
                </div>
                <div className="challenge-card-ring">
                  <VolumeRing
                    value={progress}
                    target={c.target}
                    label={joined ? 'your progress' : 'target'}
                    size={120}
                  />
                  {joined && (
                    <p className="muted">
                      {c.type === 'volume' ? formatKg(progress) : `${progress} ${c.unit}`} of{' '}
                      {c.type === 'volume' ? formatKg(c.target) : `${c.target} ${c.unit}`}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} labelledBy="challenge-create-title">
        <form className="form dialog-body" onSubmit={create}>
          <h2 id="challenge-create-title">New challenge</h2>
          <div className="field">
            <label htmlFor="ch-title">Title</label>
            <input
              id="ch-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="e.g. Three Sessions a Week"
            />
          </div>
          <div className="field">
            <label htmlFor="ch-desc">Description</label>
            <input
              id="ch-desc"
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What counts toward it"
            />
          </div>
          <div className="field">
            <label htmlFor="ch-type">What counts</label>
            <select
              id="ch-type"
              value={form.type}
              onChange={(e) => {
                const type = e.target.value;
                setForm({ ...form, type, unit: unitFor(type), target: type === 'volume' ? 20000 : 3 });
              }}
            >
              <option value="sessions">Completed sessions</option>
              <option value="volume">Kilograms lifted</option>
              <option value="streak">Distinct training days</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="ch-target">Target ({form.unit})</label>
            <input
              id="ch-target"
              type="number"
              min="1"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: parseInt(e.target.value, 10) || 1 })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="ch-start">Starts</label>
            <input
              id="ch-start"
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="ch-end">Ends</label>
            <input
              id="ch-end"
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              required
            />
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Create challenge
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(leaderboard)}
        onClose={() => setLeaderboard(null)}
        labelledBy="leaderboard-title"
      >
        {leaderboard && (
          <div className="dialog-body">
            <h2 id="leaderboard-title">{leaderboard.challenge.title} — leaderboard</h2>
            {leaderboard.leaderboard.length === 0 ? (
              <p className="muted">Nobody has joined yet.</p>
            ) : (
              <ol className="leaderboard-list">
                {leaderboard.leaderboard.map((row) => (
                  <li key={row.userId || row.name} className="leaderboard-row">
                    <span className="record-rank">{row.rank}</span>
                    <strong>{row.name}</strong>
                    <span>
                      {leaderboard.challenge.type === 'volume'
                        ? formatKg(row.progress)
                        : `${row.progress} ${leaderboard.challenge.unit}`}
                    </span>
                    {row.completed && <span className="tag">Done</span>}
                  </li>
                ))}
              </ol>
            )}
            <div className="dialog-actions">
              <button type="button" className="btn btn--dark" onClick={() => setLeaderboard(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </section>
  );
}
