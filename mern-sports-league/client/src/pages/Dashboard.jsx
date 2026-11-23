import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, asArray } from '../api';
import { CLAY_COLOURS } from '../data/config';

export default function Dashboard({ user }) {
  const [leagues, setLeagues] = useState([]);
  const [live, setLive] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    Promise.all([api.listLeagues({}), api.listLiveMatches()])
      .then(([l, lv]) => {
        if (!alive) return;
        const all = asArray(l, 'leagues');
        setLeagues(all.filter((x) => x.organizer && x.organizer.id === user.id));
        setLive(asArray(lv, 'matches'));
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [user]);

  if (!user) {
    return (
      <div className="page">
        <h1>My dashboard</h1>
        <p className="empty">Sign in to see the leagues you organize and the matches that are live.</p>
        <Link className="btn btn--primary" to="/auth">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <p className="eyebrow">Signed in as {user.name} · {user.role}</p>
      <h1>My dashboard</h1>
      {loading && <div className="skeleton-row" aria-label="Loading dashboard"><span /><span /><span /></div>}
      {!loading && (
        <>
          <section className="section" aria-labelledby="mine-title">
            <div className="section__head">
              <h2 id="mine-title">Leagues I organize</h2>
              <Link className="btn btn--primary btn--sm" to="/leagues/new">+ Start a league</Link>
            </div>
            {leagues.length === 0 && <p className="empty">You do not organize any leagues yet.</p>}
            <div className="league-grid">
              {leagues.map((l) => {
                const colour = CLAY_COLOURS[l.colour] || CLAY_COLOURS.pink;
                return (
                  <article key={l.id} className="league-card" style={{ '--clay': colour.bg }}>
                    <div className="league-card__top">
                      <span className="league-card__sport">{l.sport}</span>
                      <span className={`status-pill status-pill--${l.status}`}>{l.status}</span>
                    </div>
                    <h3><Link to={`/leagues/${l.id}`}>{l.name}</Link></h3>
                    <p className="league-card__meta">{l.season} · {l.city}</p>
                    <p className="league-card__counts">{l.teamCount} teams · {l.matchCount} matches</p>
                  </article>
                );
              })}
            </div>
          </section>
          <section className="section" aria-labelledby="live-dash-title">
            <h2 id="live-dash-title">Live matches</h2>
            {live.length === 0 && <p className="empty">Nothing live right now.</p>}
            <ul className="dash-live">
              {live.map((m) => (
                <li key={m.id}>
                  <Link to={`/matches/${m.id}`}>
                    {m.homeTeam?.shortName} {m.homeScore}–{m.awayScore} {m.awayTeam?.shortName} · {m.league?.name} · MW{m.matchweek}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
