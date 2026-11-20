import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, asArray } from '../api';

export default function Admin({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let alive = true;
    api
      .adminOverview()
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [user]);

  if (!user) {
    return (
      <main className="page">
        <h1 className="page-title">Admin <em>only</em></h1>
        <p className="page-sub">Sign in with an admin account to view the overview.</p>
        <p>
          <Link className="btn btn-primary" to="/login">Sign in</Link>
        </p>
      </main>
    );
  }

  if (!loading && (error || user.role !== 'admin')) {
    return (
      <main className="page">
        <h1 className="page-title">Admin <em>only</em></h1>
        <p className="page-sub">
          This page is for FairShare admins. {error ? `The server said: ${error}` : 'Your account does not have admin access.'}
        </p>
        <p>
          <Link className="btn btn-ghost" to="/dashboard">Back to dashboard</Link>
        </p>
      </main>
    );
  }

  const counts = data?.counts || data?.totals || data || {};
  const recentGroups = asArray(data, 'recentGroups').length
    ? asArray(data, 'recentGroups')
    : asArray(data, 'groups');

  return (
    <main className="page">
      <p className="section-label">(01) Administration</p>
      <h1 className="page-title">Overview, <em>at a glance</em></h1>
      {loading && <p className="muted" role="status">Loading overview…</p>}
      {!loading && data && (
        <>
          <div className="stat-strip" role="group" aria-label="Platform totals">
            <div className="stat">
              <span>Users</span>
              <strong>{counts.users ?? counts.userCount ?? '—'}</strong>
            </div>
            <div className="stat">
              <span>Groups</span>
              <strong>{counts.groups ?? counts.groupCount ?? '—'}</strong>
            </div>
            <div className="stat">
              <span>Expenses</span>
              <strong>{counts.expenses ?? counts.expenseCount ?? '—'}</strong>
            </div>
            <div className="stat">
              <span>Settlements</span>
              <strong>{counts.settlements ?? counts.settlementCount ?? '—'}</strong>
            </div>
          </div>

          <section aria-labelledby="recent-heading">
            <h2 className="section-title-small" id="recent-heading">Recent groups</h2>
            {recentGroups.length === 0 ? (
              <p className="empty-state">No groups recorded yet.</p>
            ) : (
              <ul className="ruled-list">
                {recentGroups.slice(0, 10).map((g) => (
                  <li key={g._id || g.id}>
                    <Link to={`/groups/${g._id || g.id}`}>{g.name}</Link>
                    <span className="muted small">
                      {g.memberCount ?? (Array.isArray(g.members) ? g.members.length : 0)} members
                      {g.createdAt ? ` · ${new Date(g.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
