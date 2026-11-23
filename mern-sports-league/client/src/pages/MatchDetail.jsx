import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { getSocket } from '../socket';
import { EVENT_LABELS } from '../data/config';
import { EMPTY_STATES } from '../data/content';
import ScoreBug from '../components/ScoreBug';

function minuteNow(match) {
  if (!match || match.status !== 'live' || !match.startedAt) return null;
  const elapsed = Math.floor((Date.now() - new Date(match.startedAt).getTime()) / 60000);
  return Math.min(elapsed, 90);
}

function eventIcon(type) {
  switch (type) {
    case 'goal': return '⚽';
    case 'penalty': return '🎯';
    case 'own-goal': return '↩️';
    case 'yellow': return '🟨';
    case 'red': return '🟥';
    case 'substitution': return '🔄';
    default: return '📝';
  }
}

export default function MatchDetail({ user }) {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [canScore, setCanScore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [minute, setMinute] = useState(minuteNow(null));
  const [eventForm, setEventForm] = useState({ minute: '', type: 'goal', team: '', player: '', note: '' });
  const [eventError, setEventError] = useState('');
  const [busy, setBusy] = useState(false);
  const tickRef = useRef(null);

  useEffect(() => {
    let alive = true;
    api.getMatch(id)
      .then((d) => {
        if (!alive) return;
        setMatch(d.match);
        setCanScore(Boolean(d.canScore));
        setEventForm((f) => ({ ...f, team: d.match.homeTeam?.id || '' }));
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    const socket = getSocket(user?.id);
    socket.emit('join-match', id);
    socket.on('match:update', (updated) => {
      if (updated.id === id) setMatch(updated);
    });
    return () => socket.off('match:update');
  }, [id, user]);

  useEffect(() => {
    if (!match || match.status !== 'live') return undefined;
    setMinute(minuteNow(match));
    tickRef.current = setInterval(() => setMinute(minuteNow(match)), 30000);
    return () => clearInterval(tickRef.current);
  }, [match]);

  const events = useMemo(() => [...(match?.events || [])].sort((a, b) => b.minute - a.minute), [match]);
  const scorers = useMemo(() => {
    if (!match) return [];
    const home = (match.homeTeam?.id && match.homeTeam) || null;
    const away = (match.awayTeam?.id && match.awayTeam) || null;
    return { home, away };
  }, [match]);

  async function handleStart() {
    setBusy(true);
    setError('');
    try {
      const d = await api.startMatch(id);
      setMatch(d.match);
      setNotice('Match started — the clock is running.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleFinish() {
    if (!window.confirm('Finish this match? The result becomes final and the table updates.')) return;
    setBusy(true);
    setError('');
    try {
      const d = await api.finishMatch(id);
      setMatch(d.match);
      setNotice('Full time — result recorded and standings updated.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddEvent(e) {
    e.preventDefault();
    setEventError('');
    const min = Number(eventForm.minute);
    if (!Number.isFinite(min) || min < 0 || min > 150) {
      setEventError('Minute must be between 0 and 150.');
      return;
    }
    setBusy(true);
    try {
      const d = await api.addEvent(id, { minute: min, type: eventForm.type, team: eventForm.team, player: eventForm.player, note: eventForm.note });
      setMatch(d.match);
      setNotice(`${EVENT_LABELS[eventForm.type]} logged at ${min}′.`);
      setEventForm((f) => ({ ...f, minute: '', player: '', note: '' }));
    } catch (err) {
      setEventError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteEvent(eventId) {
    try {
      const d = await api.deleteEvent(id, eventId);
      setMatch(d.match);
      setNotice('Event removed — the score was recomputed.');
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <div className="page"><div className="skeleton-row" aria-label="Loading match"><span /><span /><span /></div></div>;
  if (error && !match) return <div className="page"><p className="error" role="alert">{error}</p><Link className="btn btn--ghost" to="/leagues">← Back to leagues</Link></div>;
  if (!match) return null;

  const liveMinute = match.status === 'live' ? minute : null;

  return (
    <div className="page match-detail">
      <p><Link className="back-link" to={`/leagues/${match.league?.id || ''}`}>← Back to {match.league?.name || 'league'}</Link></p>
      <header className="match-head">
        <p className="eyebrow">{match.league?.name} · {match.league?.sport} · Matchweek {match.matchweek}</p>
        <h1 className="sr-only">{match.homeTeam?.name} versus {match.awayTeam?.name}</h1>
        <div className="match-head__bug">
          <div className="match-head__team">
            <span className="team-chip team-chip--lg">{match.homeTeam?.shortName}</span>
            <span className="match-head__name">{match.homeTeam?.name}</span>
          </div>
          <div className="match-head__score">
            <ScoreBug match={match} size="xl" link={false} />
            <p className="match-head__clock" aria-live="polite">
              {match.status === 'live' && liveMinute !== null ? `${liveMinute}′ — live` : match.status === 'finished' ? 'Full time' : match.status === 'postponed' ? 'Postponed' : new Date(match.scheduledAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="match-head__team match-head__team--away">
            <span className="team-chip team-chip--lg">{match.awayTeam?.shortName}</span>
            <span className="match-head__name">{match.awayTeam?.name}</span>
          </div>
        </div>
      </header>

      {notice && <p className="notice" role="status">{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {canScore && match.status !== 'finished' && (
        <div className="manage-bar" role="group" aria-label="Match controls">
          {match.status === 'scheduled' && <button type="button" className="btn btn--primary" onClick={handleStart} disabled={busy}>▶ Kick off</button>}
          {match.status === 'live' && <button type="button" className="btn btn--primary" onClick={handleFinish} disabled={busy}>■ Full time</button>}
          {match.status === 'live' && <span className="manage-bar__hint">Log events below as they happen — the score updates everywhere instantly.</span>}
        </div>
      )}
      {user && !canScore && match.status === 'live' && (
        <p className="notice" role="status">You are watching live. Only the organizer or a team captain can log events.</p>
      )}

      <div className="match-grid">
        <section className="match-events" aria-labelledby="events-title">
          <h2 id="events-title">Match events</h2>
          {events.length === 0 && <p className="empty">{EMPTY_STATES.events}</p>}
          <ol className="event-feed">
            {events.map((ev) => (
              <li key={ev.id} className="event-feed__row">
                <span className="event-feed__minute">{ev.minute}′</span>
                <span className="event-feed__icon" aria-hidden="true">{eventIcon(ev.type)}</span>
                <span className="event-feed__body">
                  <strong>{EVENT_LABELS[ev.type]}</strong>
                  {ev.player ? ` — ${ev.player}` : ''}
                  <span className="event-feed__team"> · {ev.team?.shortName || ''}</span>
                  {ev.note ? <span className="event-feed__note"> — {ev.note}</span> : ''}
                </span>
                {canScore && match.status === 'live' && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleDeleteEvent(ev.id)} aria-label={`Remove ${EVENT_LABELS[ev.type]} at minute ${ev.minute}`}>Remove</button>
                )}
              </li>
            ))}
          </ol>
        </section>

        {canScore && match.status === 'live' && (
          <section className="match-log" aria-labelledby="log-title">
            <h2 id="log-title">Log an event</h2>
            <form onSubmit={handleAddEvent} className="event-form">
              {eventError && <p className="error" role="alert">{eventError}</p>}
              <div className="event-form__row">
                <label>Minute
                  <input type="number" min="0" max="150" required value={eventForm.minute} onChange={(e) => setEventForm({ ...eventForm, minute: e.target.value })} placeholder={liveMinute !== null ? String(liveMinute) : '41'} />
                </label>
                <label>Event
                  <select value={eventForm.type} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}>
                    {Object.entries(EVENT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </label>
              </div>
              <label>Team
                <select value={eventForm.team} onChange={(e) => setEventForm({ ...eventForm, team: e.target.value })}>
                  <option value={scorers.home?.id || ''}>{match.homeTeam?.name}</option>
                  <option value={scorers.away?.id || ''}>{match.awayTeam?.name}</option>
                </select>
              </label>
              <label>Player (optional)
                <input value={eventForm.player} onChange={(e) => setEventForm({ ...eventForm, player: e.target.value })} maxLength={60} placeholder="Who was involved?" />
              </label>
              <label>Note (optional)
                <input value={eventForm.note} onChange={(e) => setEventForm({ ...eventForm, note: e.target.value })} maxLength={160} placeholder="e.g. Top corner from 20 yards" />
              </label>
              <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Logging…' : 'Log event'}</button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
