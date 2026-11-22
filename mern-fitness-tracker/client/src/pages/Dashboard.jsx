import { useEffect, useState } from 'react';
import { api, formatKg, formatDuration } from '../api.js';
import VolumeRing from '../components/VolumeRing.jsx';
import VolumeChart from '../components/VolumeChart.jsx';
import MuscleSplit from '../components/MuscleSplit.jsx';
import Marquee from '../components/Marquee.jsx';
import { getSocket } from '../socket.js';

export default function Dashboard({ user, go }) {
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  const [active, setActive] = useState(null);
  const [error, setError] = useState('');
  const [liveNote, setLiveNote] = useState('');

  useEffect(() => {
    let alive = true;
    api
      .analytics()
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(err.message));
    api
      .mySessions({ limit: 5 })
      .then((d) => alive && setRecent(d.items || []))
      .catch(() => {});
    api
      .mySessions({ status: 'active', limit: 1 })
      .then((d) => alive && setActive((d.items || [])[0] || null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket(user.id);
    const onCompleted = (payload) => {
      setLiveNote(`${payload.userName} finished ${payload.sessionName} — ${formatKg(payload.totalVolume)}`);
      setTimeout(() => setLiveNote(''), 8000);
    };
    socket.on('session:completed', onCompleted);
    return () => socket.off('session:completed', onCompleted);
  }, [user]);

  if (error) return <p className="page-error" role="alert">{error}</p>;
  if (!data) return <p className="page-loading">Loading your training…</p>;

  const { totals, streak, weeks, muscleSplit } = data;
  const thisWeek = weeks[weeks.length - 1] || { volume: 0, sessions: 0 };
  const lastWeek = weeks[weeks.length - 2] || { volume: 0 };
  const weekTarget = Math.max(1, Math.round(lastWeek.volume * 1.1) || 5000);

  return (
    <section className="section dashboard">
      <p className="section-label">(01) Dashboard</p>
      <h1 className="section-title">
        Good to see you, <em>{user.name.split(' ')[0]}.</em>
      </h1>
      <Marquee
        label="Your training at a glance"
        items={[
          `${streak}-week streak`,
          `${totals.totalSessions} sessions completed`,
          `${formatKg(totals.totalVolume)} lifetime volume`,
          `${thisWeek.sessions} session${thisWeek.sessions === 1 ? '' : 's'} this week`,
          `${formatKg(thisWeek.volume)} lifted this week`,
          `${totals.recordCount} personal records`,
        ]}
      />
      {active && (
        <div className="active-banner" role="status">
          <span>You have a session in progress — {active.name}.</span>
          <button type="button" className="btn btn--accent" onClick={() => go('session', active._id)}>
            Resume session
          </button>
        </div>
      )}
      {liveNote && (
        <p className="live-note" role="status" aria-live="polite">
          {liveNote}
        </p>
      )}

      <div className="stat-row">
        <div className="stat">
          <span className="stat-num">{totals.totalSessions}</span>
          <span className="stat-label">Sessions completed</span>
        </div>
        <div className="stat">
          <span className="stat-num">{formatKg(totals.totalVolume)}</span>
          <span className="stat-label">Total volume lifted</span>
        </div>
        <div className="stat">
          <span className="stat-num">{streak}</span>
          <span className="stat-label">Week streak</span>
        </div>
        <div className="stat">
          <span className="stat-num">{totals.recordCount}</span>
          <span className="stat-label">Personal records</span>
        </div>
      </div>

      <div className="dash-split">
        <div className="dash-main">
          <h2>This week</h2>
          <VolumeChart weeks={weeks} />
        </div>
        <div className="dash-side">
          <h2>Week target</h2>
          <VolumeRing value={thisWeek.volume} target={weekTarget} label="of weekly target" />
          <p className="muted">
            {thisWeek.sessions} session{thisWeek.sessions === 1 ? '' : 's'} this week · target{' '}
            {formatKg(weekTarget)} (last week + 10%)
          </p>
          <button type="button" className="btn btn--primary" onClick={() => go('templates')}>
            Start a workout
          </button>
        </div>
      </div>

      <div className="dash-split">
        <div className="dash-main">
          <h2>Muscle split</h2>
          <MuscleSplit split={muscleSplit} />
        </div>
        <div className="dash-side">
          <h2>Recent sessions</h2>
          {recent.length === 0 ? (
            <p className="muted">No sessions yet. Start one from a template.</p>
          ) : (
            <ul className="recent-list">
              {recent.map((s) => (
                <li key={s._id}>
                  <button type="button" className="recent-item" onClick={() => go('history')}>
                    <strong>{s.name}</strong>
                    <span>
                      {new Date(s.finishedAt || s.startedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      · {formatKg(s.totalVolume)} · {formatDuration(s.durationSeconds)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn btn--ghost" onClick={() => go('history')}>
            Full history
          </button>
        </div>
      </div>
    </section>
  );
}
