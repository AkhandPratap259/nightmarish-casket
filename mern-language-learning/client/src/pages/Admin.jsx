import { useEffect, useState } from 'react';
import { api } from '../api';
import Scramble from '../components/Scramble';

export default function Admin({ user }) {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    api
      .adminOverview()
      .then(setOverview)
      .catch((err) => setError(err.message));
  }, [user]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="page">
        <p className="section-label">(ADMIN)</p>
        <h1>
          Admins only, <em>this way.</em>
        </h1>
        <p>Sign in with the demo admin account to see platform activity.</p>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="page">
        <p aria-live="polite">{error || 'Loading the overview…'}</p>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </div>
    );
  }

  const c = overview.counts;
  return (
    <div className="page">
      <p className="section-label">(ADMIN) PLATFORM OVERVIEW</p>
      <h1>
        The whole platform, <em><Scramble text="on one page." /></em>
      </h1>
      <dl className="stat-grid">
        <div>
          <dt>Users</dt>
          <dd>{c.users}</dd>
        </div>
        <div>
          <dt>Learners</dt>
          <dd>{c.learners}</dd>
        </div>
        <div>
          <dt>Instructors</dt>
          <dd>{c.instructors}</dd>
        </div>
        <div>
          <dt>Lessons</dt>
          <dd>{c.lessons}</dd>
        </div>
        <div>
          <dt>Languages</dt>
          <dd>{c.languages}</dd>
        </div>
        <div>
          <dt>Lessons completed</dt>
          <dd>{c.lessonsCompleted}</dd>
        </div>
        <div>
          <dt>Review items</dt>
          <dd>{c.reviewItems}</dd>
        </div>
        <div>
          <dt>XP earned (24h)</dt>
          <dd>{c.xpToday}</dd>
        </div>
      </dl>

      <section aria-labelledby="top-heading">
        <p className="section-label">(TOP LEARNERS)</p>
        <h2 id="top-heading">Most XP, <em>all time.</em></h2>
        <ol className="board-list">
          {overview.topLearners.map((u, i) => (
            <li key={u._id} className="board-row">
              <span className="board-rank" aria-hidden="true">{i + 1}</span>
              <span className="board-name">{u.name}</span>
              <span className="board-meta">Level {u.level} · {u.streak}-day streak · {u.lessonsCompleted} lessons</span>
              <span className="board-xp">{u.xp} XP</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="recent-heading">
        <p className="section-label">(NEWEST ACCOUNTS)</p>
        <h2 id="recent-heading">Recently joined.</h2>
        <ol className="recent-list">
          {overview.recentUsers.map((u) => (
            <li key={u._id}>
              <span className="recent-name">{u.name}</span>
              <span className="recent-meta">{u.email} · {u.role} · Level {u.level} · {u.xp} XP</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
