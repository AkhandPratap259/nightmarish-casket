import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatINR } from '../api';
import { STATUS_LABELS } from '../data/content';

export default function Admin({ user }) {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [o, u, b] = await Promise.all([
        api.adminOverview(),
        api.adminUsers(),
        api.adminBookings(),
      ]);
      setOverview(o.overview);
      setUsers(u.users);
      setBookings(b.bookings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleUser(u) {
    try {
      await api.setUserActive(u._id, !u.active);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return (
      <main className="page">
        <h1 className="page-title">Admin</h1>
        <p>Please <Link to="/login">sign in</Link> as an admin.</p>
      </main>
    );
  }
  if (user.role !== 'admin') {
    return (
      <main className="page">
        <h1 className="page-title">Admin</h1>
        <p>This page is for admins only.</p>
      </main>
    );
  }

  return (
    <main className="page">
      <p className="section-label">Admin overview</p>
      <h1 className="page-title" aria-label="The whole marketplace, at a glance.">
        The whole marketplace, <em>at a glance.</em>
      </h1>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="muted" role="status">Loading overview…</p>}

      {overview && (
        <>
          <section className="stat-strip" aria-label="Marketplace totals">
            <div className="stat"><strong>{overview.totalUsers}</strong><span>Users ({overview.activeUsers} active)</span></div>
            <div className="stat"><strong>{overview.totalBookings}</strong><span>Bookings · {overview.completedJobs} completed</span></div>
            <div className="stat"><strong>{formatINR(overview.revenue)}</strong><span>Revenue from completed bookings</span></div>
            <div className="stat">
              <strong>{overview.usersByRole.customer} / {overview.usersByRole.provider} / {overview.usersByRole.admin}</strong>
              <span>Customers / providers / admins</span>
            </div>
          </section>

          <div className="dashboard-grid">
            <section className="dashboard-panel" aria-labelledby="status-heading">
              <h2 id="status-heading" className="section-title-small">Bookings by status</h2>
              <ul className="mini-bars">
                {Object.entries(overview.byStatus).map(([status, count]) => (
                  <li key={status}>
                    <span>{STATUS_LABELS[status] || status}</span>
                    <strong>{count}</strong>
                    <span className="mini-bar" aria-hidden="true">
                      <i
                        style={{
                          width: `${(count / Math.max(1, ...Object.values(overview.byStatus))) * 100}%`,
                        }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="dashboard-panel" aria-labelledby="top-heading">
              <h2 id="top-heading" className="section-title-small">Top providers by revenue</h2>
              <ul className="ruled-list">
                {overview.topProviders.map((p) => (
                  <li key={p.providerId}>
                    <span>{p.name}</span>
                    <strong>{formatINR(p.revenue)}</strong>
                  </li>
                ))}
                {overview.topProviders.length === 0 && <li className="muted">No completed bookings yet.</li>}
              </ul>
            </section>
          </div>
        </>
      )}

      <section className="section" aria-labelledby="users-heading">
        <h2 id="users-heading" className="section-title-small">Users ({users.length})</h2>
        <ul className="ruled-list">
          {users.map((u) => (
            <li key={u._id} className="admin-user-row">
              <span>
                <strong>{u.name}</strong> · {u.email} · {u.role} · {u.city}
              </span>
              <span>
                {u.active ? 'Active' : 'Deactivated'}{' '}
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => toggleUser(u)}
                  disabled={u._id === user.id}
                >
                  {u.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="bookings-heading">
        <h2 id="bookings-heading" className="section-title-small">Recent bookings ({bookings.length})</h2>
        <ul className="ruled-list">
          {bookings.slice(0, 20).map((b) => (
            <li key={b._id}>
              <span>
                {b.serviceName} — {b.customer?.name} → {b.provider?.name} · {b.date} {b.slot}
              </span>
              <strong>{STATUS_LABELS[b.status] || b.status}</strong>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
