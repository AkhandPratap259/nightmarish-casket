import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Admin({ user }) {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    let alive = true;
    Promise.all([api.adminOverview(), api.adminUsers()])
      .then(([o, u]) => {
        if (!alive) return;
        setOverview(o);
        setUsers(u.users || []);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [user]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="page">
        <h1>Admin</h1>
        <p className="empty">This area is for admins only.</p>
        <Link className="btn btn--primary" to="/">Back home</Link>
      </div>
    );
  }

  async function toggleActive(u) {
    try {
      const res = await api.adminSetUserActive(u.id, !u.active);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? res.user : x)));
      setNotice(`${res.user.name} is now ${res.user.active ? 'active' : 'deactivated'}.`);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="page">
      <h1>Admin overview</h1>
      {loading && <div className="skeleton-row" aria-label="Loading admin data"><span /><span /><span /></div>}
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {overview && (
        <div className="admin-stats">
          <span className="stat-chip"><strong>{overview.users}</strong> users</span>
          <span className="stat-chip"><strong>{overview.leagues}</strong> leagues</span>
          <span className="stat-chip"><strong>{overview.teams}</strong> teams</span>
          <span className="stat-chip"><strong>{overview.matches}</strong> matches</span>
          <span className="stat-chip"><strong>{overview.liveMatches}</strong> live now</span>
        </div>
      )}
      <section aria-labelledby="users-title">
        <h2 id="users-title">Accounts</h2>
        <div className="table-wrap">
          <table className="standings">
            <thead>
              <tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Action</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.active ? 'Active' : 'Deactivated'}</td>
                  <td>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleActive(u)} disabled={u.id === user.id}>
                      {u.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
