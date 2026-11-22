import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatINR, formatDate, todayStr } from '../api';
import { STATUS_LABELS } from '../data/content';
import Reveal from '../components/Reveal';

export default function ProviderDashboard({ user }) {
  const [bookings, setBookings] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [b, o, a] = await Promise.all([
        api.myBookings(),
        api.myOfferings(),
        api.providerAnalytics(),
      ]);
      setBookings(b.bookings);
      setOfferings(o.offerings);
      setAnalytics(a.analytics);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeStatus(booking, status) {
    setError('');
    try {
      const data = await api.updateBookingStatus(booking._id, status);
      setBookings((prev) => prev.map((x) => (x._id === booking._id ? data.booking : x)));
      setNotice(`Booking ${data.booking.serviceName} is now ${STATUS_LABELS[status]}.`);
      const a = await api.providerAnalytics();
      setAnalytics(a.analytics);
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleOffering(offering) {
    try {
      await api.updateOffering(offering._id, { active: !offering.active });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteOffering(offering) {
    if (!window.confirm(`Delete the offering “${offering.service?.name}”?`)) return;
    try {
      await api.deleteOffering(offering._id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return (
      <main className="page">
        <h1 className="page-title">Provider dashboard</h1>
        <p>Please <Link to="/login">sign in</Link> as a provider to see your dashboard.</p>
      </main>
    );
  }
  if (user.role !== 'provider') {
    return (
      <main className="page">
        <h1 className="page-title">Provider dashboard</h1>
        <p>This page is for providers. <Link to="/browse">Browse services</Link> as a customer instead.</p>
      </main>
    );
  }

  const today = todayStr();
  const incoming = bookings.filter((b) => b.status === 'requested');
  const todaysJobs = bookings.filter(
    (b) => b.date === today && ['accepted', 'in_progress'].includes(b.status)
  );
  const statusCounts = Object.keys(STATUS_LABELS).map((s) => ({
    status: s,
    count: bookings.filter((b) => b.status === s).length,
  }));
  const maxStatusCount = Math.max(1, ...statusCounts.map((s) => s.count));

  return (
    <main className="page">
      <p className="section-label">Provider dashboard</p>
      <h1 className="page-title" aria-label="Your work, one place.">
        Your work, <em>one place.</em>
      </h1>
      {notice && <p className="live-notice" role="status" aria-live="polite">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="muted" role="status">Loading dashboard…</p>}

      {analytics && (
        <section className="stat-strip" aria-label="Earnings and performance">
          <div className="stat"><strong>{formatINR(analytics.earnings)}</strong><span>Total earnings (completed jobs)</span></div>
          <div className="stat"><strong>{formatINR(analytics.thisMonthEarnings)}</strong><span>This month · {analytics.thisMonthJobs} jobs</span></div>
          <div className="stat"><strong>{analytics.completedJobs}</strong><span>Jobs completed</span></div>
          <div className="stat"><strong>{Math.round(analytics.responseRate * 100)}%</strong><span>Response rate · ★ {analytics.rating} ({analytics.reviewCount} reviews)</span></div>
        </section>
      )}

      <section className="panel panel--tape tape tape--indigo" aria-labelledby="status-bars-heading">
        <div className="panel-head">
          <h2 id="status-bars-heading" className="section-title-small">Jobs by status</h2>
          <span className="muted small">Live counts from your bookings</span>
        </div>
        <ul className="mini-bars">
          {statusCounts.map(({ status, count }) => (
            <li key={status}>
              <span>{STATUS_LABELS[status] || status}</span>
              <strong>{count}</strong>
              <span className="mini-bar" aria-hidden="true">
                <i style={{ width: `${(count / maxStatusCount) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-panel" aria-labelledby="incoming-heading">
          <Reveal>
            <h2 id="incoming-heading" className="section-title-small">Incoming requests ({incoming.length})</h2>
          </Reveal>
          {incoming.length === 0 && <p className="muted">No new requests right now.</p>}
          <ul className="booking-list">
            {incoming.map((b) => (
              <li key={b._id} className="booking-row">
                <div className="booking-head">
                  <div>
                    <strong>{b.serviceName}</strong>
                    <span className="muted">
                      {b.customer?.name} · {formatDate(b.date)} at {b.slot} · {b.area}
                    </span>
                  </div>
                  <span className="booking-price">{formatINR(b.priceBreakdown?.total)}</span>
                </div>
                <p className="muted small">{b.address}{b.notes ? ` · “${b.notes}”` : ''}</p>
                <div className="booking-actions">
                  <button type="button" className="btn btn-primary btn-small" onClick={() => changeStatus(b, 'accepted')}>
                    Accept
                  </button>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => changeStatus(b, 'declined')}>
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="dashboard-panel" aria-labelledby="today-heading">
          <Reveal>
            <h2 id="today-heading" className="section-title-small">Today&apos;s schedule ({todaysJobs.length})</h2>
          </Reveal>
          {todaysJobs.length === 0 && <p className="muted">Nothing scheduled for today.</p>}
          <ul className="booking-list">
            {todaysJobs.map((b) => (
              <li key={b._id} className="booking-row">
                <div className="booking-head">
                  <div>
                    <strong>{b.slot} — {b.serviceName}</strong>
                    <span className="muted">{b.customer?.name} · {b.area} · {b.address}</span>
                  </div>
                  <span className={`status-pill status-pill--${b.status}`}>{STATUS_LABELS[b.status]}</span>
                </div>
                <div className="booking-actions">
                  {b.status === 'accepted' && (
                    <button type="button" className="btn btn-primary btn-small" onClick={() => changeStatus(b, 'in_progress')}>
                      Start job
                    </button>
                  )}
                  {b.status === 'in_progress' && (
                    <button type="button" className="btn btn-primary btn-small" onClick={() => changeStatus(b, 'completed')}>
                      Mark completed
                    </button>
                  )}
                  <Link className="btn btn-ghost btn-small" to="/bookings">All bookings</Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="offerings-heading" className="section">
        <Reveal>
          <div className="section-head-row">
            <h2 id="offerings-heading" className="section-title-small">My offerings ({offerings.length})</h2>
            <Link className="btn btn-primary btn-small" to="/provider/offerings/new">Add offering</Link>
          </div>
        </Reveal>
        <ul className="offering-list">
          {offerings.map((o) => (
            <li key={o._id} className="offering-row">
              <div className="offering-body">
                <span className="offering-category">{o.service?.category}</span>
                <strong className="offering-name">{o.service?.name}</strong>
                <span className="muted">
                  {formatINR(o.price)} · {o.durationMin} min · {o.areas.join(', ')} · {o.active ? 'Active' : 'Paused'}
                </span>
              </div>
              <div className="offering-actions">
                <Link className="btn btn-ghost btn-small" to={`/provider/offerings/${o._id}/edit`}>Edit</Link>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => toggleOffering(o)}>
                  {o.active ? 'Pause' : 'Activate'}
                </button>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => deleteOffering(o)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        {offerings.length === 0 && <p className="muted">You have no offerings yet — add your first one.</p>}
      </section>
    </main>
  );
}
