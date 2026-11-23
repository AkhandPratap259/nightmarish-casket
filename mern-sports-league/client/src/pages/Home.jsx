import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, asArray } from '../api';
import { getSocket } from '../socket';
import { HERO, HOW_IT_WORKS } from '../data/content';
import { CLAY_COLOURS } from '../data/config';
import ScoreBug from '../components/ScoreBug';
import LeagueArt from '../components/LeagueArt';

function Ticker({ items }) {
  if (!items.length) return null;
  const line = items.map((m) => `${m.homeTeam?.shortName || 'HOM'} ${m.homeScore}–${m.awayScore} ${m.awayTeam?.shortName || 'AWY'} · ${m.league?.name || ''}`).join('   ◆   ');
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker__track"><span>{line}</span><span>{line}</span></div>
    </div>
  );
}

export default function Home({ user }) {
  const [leagues, setLeagues] = useState([]);
  const [live, setLive] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([api.listLeagues({}), api.listLiveMatches()])
      .then(([l, lv]) => {
        if (!alive) return;
        setLeagues(asArray(l, 'leagues'));
        setLive(asArray(lv, 'matches'));
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!leagues.length) return undefined;
    let alive = true;
    api.listMatches(leagues[0].id, { status: 'finished' })
      .then((d) => { if (alive) setRecent(asArray(d, 'matches').slice(0, 6)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [leagues]);

  useEffect(() => {
    const socket = getSocket(user?.id);
    socket.on('match:update', (match) => {
      setLive((prev) => {
        const others = prev.filter((m) => m.id !== match.id);
        return match.status === 'live' ? [match, ...others] : others;
      });
    });
    return () => socket.off('match:update');
  }, [user]);

  const featured = leagues.slice(0, 3);
  const heroMatch = live[0];

  return (
    <div className="home">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__copy">
          <p className="eyebrow">{HERO.eyebrow}</p>
          <h1 id="hero-title" className="hero__title" aria-label={HERO.title}>
            <span className="hero__line">Every match.</span>
            <span className="hero__line hero__line--accent">Every goal.</span>
            <span className="hero__line">One scoreboard.</span>
          </h1>
          <p className="hero__lead">{HERO.lead}</p>
          <div className="hero__ctas">
            <Link className="btn btn--primary" to="/leagues">{HERO.primaryCta}</Link>
            <Link className="btn btn--secondary" to="/leagues/new">{HERO.secondaryCta}</Link>
          </div>
          <p className="hero__hint">Press <kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere to jump — leagues, matches, actions.</p>
        </div>
        <div className="hero__collage" aria-hidden="false">
          <div className="collage-card collage-card--art">
            <LeagueArt colour="pink" home={heroMatch?.homeTeam?.shortName || 'AZA'} away={heroMatch?.awayTeam?.shortName || 'RVR'} homeScore={heroMatch?.homeScore ?? 2} awayScore={heroMatch?.awayScore ?? 1} />
          </div>
          <div className="collage-card collage-card--bug">
            {heroMatch ? <ScoreBug match={heroMatch} size="md" /> : <p className="collage-card__note">No live match right now — the next kick-off lights this bug up.</p>}
            <p className="collage-card__caption">{heroMatch ? `${heroMatch.league?.name || ''} · Matchweek ${heroMatch.matchweek}` : 'Live score bug'}</p>
          </div>
          <div className="collage-card collage-card--sticker">
            <span className="sticker">ROUND-ROBIN<br />IN ONE CLICK</span>
          </div>
          <div className="collage-card collage-card--tape">
            <span className="tape-label">STANDINGS · TIEBREAKERS · SCORERS</span>
          </div>
        </div>
      </section>

      <Ticker items={recent} />

      <section className="section" aria-labelledby="live-title">
        <div className="section__head">
          <h2 id="live-title">Live right now</h2>
          <Link className="section__link" to="/leagues">All leagues →</Link>
        </div>
        {loading && <div className="skeleton-row" aria-label="Loading live matches"><span /><span /><span /></div>}
        {!loading && live.length === 0 && <p className="empty">No matches are live at the moment. Check the fixtures for the next kick-off.</p>}
        <div className="live-grid">
          {live.map((m) => (
            <article key={m.id} className="live-card">
              <p className="live-card__meta">{m.league?.name} · Matchweek {m.matchweek}</p>
              <ScoreBug match={m} size="lg" link={false} />
              <div className="live-card__teams">
                <span>{m.homeTeam?.name}</span>
                <span>{m.awayTeam?.name}</span>
              </div>
              <Link className="btn btn--ghost btn--sm" to={`/matches/${m.id}`}>Open match centre →</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="featured-title">
        <div className="section__head">
          <h2 id="featured-title">Featured leagues</h2>
          <Link className="section__link" to="/leagues">Browse all →</Link>
        </div>
        {loading && <div className="skeleton-row" aria-label="Loading leagues"><span /><span /><span /></div>}
        <div className="league-grid">
          {featured.map((l) => {
            const colour = CLAY_COLOURS[l.colour] || CLAY_COLOURS.pink;
            return (
              <article key={l.id} className="league-card" style={{ '--clay': colour.bg }}>
                <div className="league-card__top">
                  <span className="league-card__sport">{l.sport}</span>
                  <span className={`status-pill status-pill--${l.status}`}>{l.status}</span>
                </div>
                <h3><Link to={`/leagues/${l.id}`}>{l.name}</Link></h3>
                <p className="league-card__meta">{l.season} · {l.city}</p>
                <p className="league-card__desc">{l.description}</p>
                <p className="league-card__counts">{l.teamCount} teams · {l.matchCount} matches</p>
              </article>
            );
          })}
        </div>
        {!loading && featured.length === 0 && <p className="empty">No leagues yet — start the first one.</p>}
      </section>

      <section className="section stack-section" aria-labelledby="how-title">
        <h2 id="how-title">How a league runs on PlayPulse</h2>
        <div className="stack-cards">
          {HOW_IT_WORKS.map((step) => (
            <article key={step.step} className="stack-card">
              <span className="stack-card__num">{step.step}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
