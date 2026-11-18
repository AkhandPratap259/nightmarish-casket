import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Admin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api
      .adminOverview()
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p className="page-error" role="alert">{error}</p>;
  if (!data) return <p className="page-loading">Loading admin overview…</p>;

  const { totals, roleBreakdown, recentUsers } = data;
  return (
    <section className="section">
      <p className="section-label">(10) Admin</p>
      <h1 className="section-title">
        The gym, <em>at a glance.</em>
      </h1>
      <div className="stat-row">
        <div className="stat">
          <span className="stat-num">{totals.users}</span>
          <span className="stat-label">Users</span>
        </div>
        <div className="stat">
          <span className="stat-num">{totals.sessions}</span>
          <span className="stat-label">Sessions started</span>
        </div>
        <div className="stat">
          <span className="stat-num">{totals.completedSessions}</span>
          <span className="stat-label">Sessions completed</span>
        </div>
        <div className="stat">
          <span className="stat-num">{totals.exercises}</span>
          <span className="stat-label">Exercises</span>
        </div>
        <div className="stat">
          <span className="stat-num">{totals.templates}</span>
          <span className="stat-label">Templates</span>
        </div>
        <div className="stat">
          <span className="stat-num">{totals.challenges}</span>
          <span className="stat-label">Challenges</span>
        </div>
      </div>
      <h2>Users by role</h2>
      <ul className="role-list">
        {roleBreakdown.map((r) => (
          <li key={r._id}>
            <strong>{r._id}</strong> — {r.count}
          </li>
        ))}
      </ul>
      <h2>Newest members</h2>
      <ul className="recent-list">
        {recentUsers.map((u) => (
          <li key={u._id} className="recent-item">
            <strong>{u.name}</strong>
            <span>
              {u.email} · {u.role} ·{' '}
              {new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
