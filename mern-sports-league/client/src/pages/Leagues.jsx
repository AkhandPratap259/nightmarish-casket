import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, asArray } from '../api';
import { SPORTS, CLAY_COLOURS } from '../data/config';
import FlipList from '../components/FlipList';

export default function Leagues() {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [sport, setSport] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    let alive = true;
    api.listLeagues({})
      .then((d) => { if (alive) setLeagues(asArray(d, 'leagues')); })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    const filtered = leagues.filter((l) => {
      if (sport && l.sport !== sport) return false;
      if (status && l.status !== status) return false;
      if (query && !`${l.name} ${l.city} ${l.sport}`.toLowerCase().includes(query)) return false;
      return true;
    });
    if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'teams') filtered.sort((a, b) => (b.teamCount || 0) - (a.teamCount || 0));
    else filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return filtered;
  }, [leagues, q, sport, status, sort]);

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">All leagues</p>
        <h1>Find a league to follow</h1>
        <p className="page-head__lead">Football, futsal and hockey leagues run by local organizers. Filter, sort, and the grid reorders with a flip — no page reload.</p>
      </header>

      <form className="filters" onSubmit={(e) => e.preventDefault()} aria-label="Filter leagues">
        <label className="filters__field">
          <span>Search</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="League, city or sport…" aria-label="Search leagues" />
        </label>
        <label className="filters__field">
          <span>Sport</span>
          <select value={sport} onChange={(e) => setSport(e.target.value)} aria-label="Filter by sport">
            <option value="">All sports</option>
            {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="filters__field">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">Any status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label className="filters__field">
          <span>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort leagues">
            <option value="newest">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="teams">Most teams</option>
          </select>
        </label>
        <Link className="btn btn--primary filters__cta" to="/leagues/new">+ Start a league</Link>
      </form>

      {error && <p className="error" role="alert">{error}</p>}
      {loading && <div className="skeleton-row" aria-label="Loading leagues"><span /><span /><span /></div>}
      {!loading && visible.length === 0 && <p className="empty">No leagues match those filters yet.</p>}
      <p className="result-count" aria-live="polite">{!loading && `${visible.length} league${visible.length === 1 ? '' : 's'}`}</p>

      <FlipList
        items={visible}
        itemKey={(l) => l.id}
        renderItem={(l) => {
          const colour = CLAY_COLOURS[l.colour] || CLAY_COLOURS.pink;
          return (
            <article className="league-card" style={{ '--clay': colour.bg }}>
              <div className="league-card__top">
                <span className="league-card__sport">{l.sport}</span>
                <span className={`status-pill status-pill--${l.status}`}>{l.status}</span>
              </div>
              <h2><Link to={`/leagues/${l.id}`}>{l.name}</Link></h2>
              <p className="league-card__meta">{l.season} · {l.city}</p>
              <p className="league-card__desc">{l.description}</p>
              <p className="league-card__counts">{l.teamCount} teams · {l.matchCount} matches</p>
              <Link className="btn btn--ghost btn--sm" to={`/leagues/${l.id}`}>Open league →</Link>
            </article>
          );
        }}
      />
    </div>
  );
}
