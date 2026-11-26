import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Admin({ toast }) {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [o, u] = await Promise.all([api.adminOverview(), api.adminUsers()]);
        setOverview(o);
        setUsers(u.users || []);
      } catch (err) {
        setError(err.message || 'Could not load the admin overview');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function toggleActive(u) {
    try {
      await api.adminSetUserActive(u.id, !u.active);
      setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, active: !x.active } : x)));
      toast(`${u.name} ${u.active ? 'deactivated' : 'activated'}.`, 'success');
    } catch (err) {
      toast(err.message || 'Could not update that account', 'error');
    }
  }

  if (loading) {
    return (
      <div className="wrap page">
        <div className="skeleton" aria-label="Loading admin overview"><div className="bar" style={{ width: '40%' }} /><div className="bar" style={{ width: '60%' }} /></div>
      </div>
    );
  }
  if (error) {
    return <div className="wrap page"><p className="status error" role="alert">{error}</p></div>;
  }

  return (
    <div className="wrap page">
      <span className="eyebrow red">Admin</span>
      <h1 style={{ fontSize: '3rem' }}>Garden overview</h1>
      <div className="grid cols-3" style={{ marginTop: 20 }}>
        <div className="card"><b style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem' }}>{overview.users}</b><div className="muted">gardeners</div></div>
        <div className="card"><b style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem' }}>{overview.gardens}</b><div className="muted">gardens</div></div>
        <div className="card"><b style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem' }}>{overview.beds}</b><div className="muted">beds</div></div>
        <div className="card"><b style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem' }}>{overview.plantings}</b><div className="muted">plantings</div></div>
        <div className="card"><b style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem' }}>{overview.harvested}</b><div className="muted">harvested</div></div>
        <div className="card"><b style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem' }}>{overview.openTasks}</b><div className="muted">open tasks</div></div>
      </div>

      <h2 style={{ fontSize: '1.8rem', margin: '28px 0 12px' }}>Accounts</h2>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.active ? <span className="pill green">Active</span> : <span className="pill red">Deactivated</span>}</td>
                <td><button className="btn small" type="button" onClick={() => toggleActive(u)}>{u.active ? 'Deactivate' : 'Activate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
