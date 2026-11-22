import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import Scramble from '../components/Scramble';

// Weekly leaderboard with live updates: when the server broadcasts a
// leaderboard change, rows re-sort and the changed row flashes.
export default function Leaderboard({ user, boardTick }) {
  const [tab, setTab] = useState('weekly');
  const [board, setBoard] = useState([]);
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');
  const [flashIds, setFlashIds] = useState(new Set());
  const prevXp = useRef(new Map());

  useEffect(() => {
    let cancelled = false;
    setError('');
    const load = tab === 'weekly' ? api.leaderboardWeekly : api.leaderboardAllTime;
    load()
      .then((d) => {
        if (cancelled) return;
        const changed = new Set();
        for (const row of d.board) {
          const prev = prevXp.current.get(String(row.userId));
          if (prev !== undefined && prev !== row.weeklyXp) changed.add(String(row.userId));
          prevXp.current.set(String(row.userId), row.weeklyXp);
        }
        setBoard(d.board);
        setMe(d.me || null);
        if (changed.size) {
          setFlashIds(changed);
          window.setTimeout(() => setFlashIds(new Set()), 1600);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, boardTick]);

  return (
    <div className="page">
      <p className="section-label">(LEADERBOARD) LIVE</p>
      <h1>
        This week’s <em><Scramble text="top learners." /></em>
      </h1>
      <p className="page-sub">
        Weekly XP is counted from real lesson and review activity in the last 7 days.
        The board updates live as anyone earns XP.
      </p>
      <div className="lang-tabs" role="group" aria-label="Leaderboard period">
        <button type="button" className={tab === 'weekly' ? 'is-active' : ''} onClick={() => setTab('weekly')} aria-pressed={tab === 'weekly'}>
          This week
        </button>
        <button type="button" className={tab === 'all-time' ? 'is-active' : ''} onClick={() => setTab('all-time')} aria-pressed={tab === 'all-time'}>
          All time
        </button>
      </div>
      {error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : null}
      {me && tab === 'weekly' ? (
        <p className="me-line" aria-live="polite">
          You: <strong>{me.weeklyXp} XP</strong> this week
          {me.rank ? ` · rank #${me.rank}` : ' · not on the board yet — finish a lesson to appear'}
        </p>
      ) : null}
      <ol className="board-list">
        {board.map((row) => {
          const isMe = user && String(row.userId) === String(user.id);
          return (
            <li
              key={row.userId}
              className={`board-row ${isMe ? 'is-me' : ''} ${flashIds.has(String(row.userId)) ? 'is-flashing' : ''}`}
            >
              <span className="board-rank" aria-hidden="true">{row.rank}</span>
              <span className="board-name">
                {row.name}
                {isMe ? ' (you)' : ''}
              </span>
              <span className="board-meta">Level {row.level} · {row.streak}-day streak</span>
              <span className="board-xp">{row.weeklyXp} XP</span>
            </li>
          );
        })}
      </ol>
      {!board.length && !error ? <p className="empty-note">No XP earned yet this week. Be the first.</p> : null}
    </div>
  );
}
