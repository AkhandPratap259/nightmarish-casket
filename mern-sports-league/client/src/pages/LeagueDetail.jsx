import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, asArray } from '../api';
import { getSocket } from '../socket';
import { CLAY_COLOURS } from '../data/config';
import { EMPTY_STATES } from '../data/content';
import StandingsTable from '../components/StandingsTable';
import GoalsChart from '../components/GoalsChart';
import ScoreBug from '../components/ScoreBug';
import FlipList from '../components/FlipList';
import Dialog from '../components/Dialog';

function fmtDate(value) {
  return new Date(value).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function LeagueDetail({ user }) {
  const { id } = useParams();
  const [league, setLeague] = useState(null);
  const [canManage, setCanManage] = useState(false);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [weekFilter, setWeekFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [teamDialog, setTeamDialog] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: '', shortName: '', colour: 'sky', playersText: '' });
  const [teamError, setTeamError] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.getLeague(id),
      api.listTeams(id),
      api.listMatches(id),
      api.getStandings(id),
      api.getAnalytics(id),
    ])
      .then(([l, t, m, s, a]) => {
        setLeague(l.league);
        setCanManage(Boolean(l.canManage));
        setTeams(asArray(t, 'teams'));
        setMatches(asArray(m, 'matches'));
        setStandings(s.standings || []);
        setAnalytics(a);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = getSocket(user?.id);
    socket.emit('join-league', id);
    socket.on('match:update', (match) => {
      if (match.league && match.league.id !== id) return;
      setMatches((prev) => prev.map((m) => (m.id === match.id ? match : m)));
    });
    socket.on('league:fixtures', () => load());
    return () => {
      socket.off('match:update');
      socket.off('league:fixtures');
    };
  }, [id, user, load]);

  const matchweeks = useMemo(() => [...new Set(matches.map((m) => m.matchweek))].sort((a, b) => a - b), [matches]);
  const visibleMatches = useMemo(() => matches.filter((m) => {
    if (weekFilter && m.matchweek !== Number(weekFilter)) return false;
    if (statusFilter && m.status !== statusFilter) return false;
    return true;
  }), [matches, weekFilter, statusFilter]);

  async function handleGenerateClick() {
    const regenerate = league.fixturesGenerated;
    if (regenerate && !window.confirm('Fixtures already exist. Rebuild the whole season? Existing results will be lost.')) return;
    setGenerating(true);
    setNotice('');
    setError('');
    try {
      const url = `/api/leagues/${id}/generate-fixtures${regenerate ? '?regenerate=true' : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('playpulse_token')}` },
        body: '{}',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fixture generation failed');
      setNotice(`Fixtures ${regenerate ? 'rebuilt' : 'generated'} — ${data.matchCount} matches across ${data.matchweeks} matchweeks.`);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleAddTeam(e) {
    e.preventDefault();
    setTeamError('');
    const players = teamForm.playersText.split('\n').map((line) => line.trim()).filter(Boolean).map((name) => ({ name }));
    try {
      await api.createTeam(id, { name: teamForm.name, shortName: teamForm.shortName, colour: teamForm.colour, players });
      setTeamDialog(false);
      setTeamForm({ name: '', shortName: '', colour: 'sky', playersText: '' });
      setNotice('Team added.');
      load();
    } catch (err) {
      setTeamError(err.message);
    }
  }

  async function handleDeleteTeam(teamId) {
    if (!window.confirm('Remove this team? Its scheduled fixtures will be removed too.')) return;
    try {
      await api.deleteTeam(teamId);
      setNotice('Team removed.');
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <div className="page"><div className="skeleton-row" aria-label="Loading league"><span /><span /><span /></div></div>;
  if (error && !league) return <div className="page"><p className="error" role="alert">{error}</p><Link className="btn btn--ghost" to="/leagues">← Back to leagues</Link></div>;
  if (!league) return null;

  const colour = CLAY_COLOURS[league.colour] || CLAY_COLOURS.pink;

  return (
    <div className="page league-detail">
      <p><Link className="back-link" to="/leagues">← All leagues</Link></p>
      <header className="league-head" style={{ '--clay': colour.bg }}>
        <div>
          <p className="eyebrow">{league.sport} · {league.season}</p>
          <h1>{league.name}</h1>
          <p className="league-head__meta">{league.city} · Organized by {league.organizer?.name || '—'}</p>
          <p>{league.description}</p>
        </div>
        <div className="league-head__stats">
          <span className={`status-pill status-pill--${league.status}`}>{league.status}</span>
          <span className="stat-chip"><strong>{teams.length}</strong> teams</span>
          <span className="stat-chip"><strong>{matches.length}</strong> matches</span>
          <span className="stat-chip"><strong>{analytics?.totalGoals ?? 0}</strong> goals</span>
        </div>
      </header>

      {notice && <p className="notice" role="status">{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {canManage && (
        <div className="manage-bar" role="group" aria-label="League management">
          <button type="button" className="btn btn--primary" onClick={handleGenerateClick} disabled={generating || teams.length < 2}>
            {generating ? 'Generating…' : league.fixturesGenerated ? 'Rebuild fixtures' : 'Generate fixtures'}
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => setTeamDialog(true)} disabled={league.fixturesGenerated}>+ Add team</button>
          {teams.length < 2 && <span className="manage-bar__hint">Add at least 2 teams before generating fixtures.</span>}
          {league.fixturesGenerated && <span className="manage-bar__hint">Fixtures are set — add teams only before generation.</span>}
        </div>
      )}

      <div className="stack-cards stack-cards--detail">
        <section className="stack-card" aria-labelledby="standings-title">
          <h2 id="standings-title">Standings</h2>
          <StandingsTable standings={standings} />
        </section>

        <section className="stack-card" aria-labelledby="fixtures-title">
          <div className="section__head">
            <h2 id="fixtures-title">Fixtures &amp; results</h2>
            <div className="mini-filters">
              <label>Matchweek
                <select value={weekFilter} onChange={(e) => setWeekFilter(e.target.value)} aria-label="Filter by matchweek">
                  <option value="">All</option>
                  {matchweeks.map((w) => <option key={w} value={w}>MW{w}</option>)}
                </select>
              </label>
              <label>Status
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by match status">
                  <option value="">All</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live</option>
                  <option value="finished">Finished</option>
                </select>
              </label>
            </div>
          </div>
          {matches.length === 0 && <p className="empty">{EMPTY_STATES.fixtures}</p>}
          {matches.length > 0 && visibleMatches.length === 0 && <p className="empty">No matches match those filters.</p>}
          <FlipList
            items={visibleMatches}
            itemKey={(m) => m.id}
            renderItem={(m) => (
              <article className="fixture-row">
                <span className="fixture-row__week">MW{m.matchweek}</span>
                <span className="fixture-row__date">{fmtDate(m.scheduledAt)}</span>
                <ScoreBug match={m} size="sm" />
                <span className="fixture-row__names">{m.homeTeam?.name} <em>vs</em> {m.awayTeam?.name}</span>
                <Link className="btn btn--ghost btn--sm" to={`/matches/${m.id}`}>{m.status === 'live' ? 'Live centre →' : m.status === 'finished' ? 'Report →' : 'Details →'}</Link>
              </article>
            )}
          />
        </section>

        <section className="stack-card" aria-labelledby="scorers-title">
          <h2 id="scorers-title">Top scorers</h2>
          {analytics && analytics.topScorers.length > 0 ? (
            <ol className="scorers">
              {analytics.topScorers.map((s, i) => (
                <li key={`${s.teamId}-${s.player}`} className="scorers__row">
                  <span className="scorers__rank">{i + 1}</span>
                  <span className="scorers__name">{s.player}</span>
                  <span className="scorers__team">{s.teamName}</span>
                  <span className="scorers__goals">{s.goals} goal{s.goals === 1 ? '' : 's'}{s.penalties > 0 ? ` (${s.penalties} pen)` : ''}</span>
                </li>
              ))}
            </ol>
          ) : <p className="empty">{EMPTY_STATES.scorers}</p>}
          <h3 className="stats-sub">Goals per matchweek</h3>
          <GoalsChart data={analytics?.goalsPerMatchweek || []} />
          {analytics && (
            <p className="stats-line">
              {analytics.finishedMatches} finished of {analytics.totalMatches} matches · {analytics.goalsPerMatch} goals per match
              {analytics.biggestWin ? ` · Biggest win: ${analytics.biggestWin.home} ${analytics.biggestWin.homeScore}–${analytics.biggestWin.awayScore} ${analytics.biggestWin.away}` : ''}
            </p>
          )}
        </section>

        <section className="stack-card" aria-labelledby="teams-title">
          <h2 id="teams-title">Teams</h2>
          <div className="team-grid">
            {teams.map((t) => {
              const tc = CLAY_COLOURS[t.colour] || CLAY_COLOURS.sky;
              return (
                <article key={t.id} className="team-card" style={{ '--clay': tc.bg }}>
                  <div className="team-card__head">
                    <span className="team-chip team-chip--lg">{t.shortName}</span>
                    <h3>{t.name}</h3>
                  </div>
                  <p className="team-card__meta">{t.playerCount} players{t.captain ? ` · Captain: ${t.captain.name}` : ''}</p>
                  <ul className="team-card__players">
                    {t.players.slice(0, 5).map((p, i) => <li key={i}>{p.number ? `#${p.number} ` : ''}{p.name}{p.position ? ` — ${p.position}` : ''}</li>)}
                    {t.players.length > 5 && <li>…and {t.players.length - 5} more</li>}
                  </ul>
                  {canManage && <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleDeleteTeam(t.id)}>Remove team</button>}
                </article>
              );
            })}
          </div>
          {teams.length === 0 && <p className="empty">No teams yet — the organizer adds them before fixtures are generated.</p>}
        </section>
      </div>

      <Dialog open={teamDialog} onClose={() => setTeamDialog(false)} label="Add a team">
        <form onSubmit={handleAddTeam} className="dialog-form">
          <h2>Add a team</h2>
          {teamError && <p className="error" role="alert">{teamError}</p>}
          <label>Team name
            <input required value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} maxLength={70} />
          </label>
          <label>Short code (2–4 letters, shown on the score bug)
            <input required value={teamForm.shortName} onChange={(e) => setTeamForm({ ...teamForm, shortName: e.target.value.toUpperCase() })} maxLength={4} minLength={2} />
          </label>
          <label>Clay colour
            <select value={teamForm.colour} onChange={(e) => setTeamForm({ ...teamForm, colour: e.target.value })}>
              {Object.entries(CLAY_COLOURS).map(([key, c]) => <option key={key} value={key}>{c.label}</option>)}
            </select>
          </label>
          <label>Players — one name per line
            <textarea rows={5} value={teamForm.playersText} onChange={(e) => setTeamForm({ ...teamForm, playersText: e.target.value })} placeholder={'Arjun Yadav\nVikram Singh\nSahil Khan'} />
          </label>
          <div className="dialog-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setTeamDialog(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary">Add team</button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
