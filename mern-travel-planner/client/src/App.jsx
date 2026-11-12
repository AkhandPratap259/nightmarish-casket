import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api, setToken, formatDate, formatDateShort, inr, TRIP_STATUSES, COVER_STYLES } from './api.js';
import { config, COVER_LABELS } from './data/config.js';
import Cursor from './components/Cursor.jsx';
import Dialog from './components/Dialog.jsx';
import TripDetail from './components/TripDetail.jsx';

let socket = null;
export function getSocket() {
  return socket;
}

function connectSocket(userId) {
  if (socket) socket.disconnect();
  socket = io('/', { auth: { userId } });
  return socket;
}

function statusLabel(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function daysUntil(dateIso) {
  const d = Math.ceil((new Date(dateIso) - Date.now()) / 86400000);
  if (d < 0) return `${-d} day${d === -1 ? '' : 's'} ago`;
  if (d === 0) return 'Today';
  return `in ${d} day${d === 1 ? '' : 's'}`;
}

function NewTripForm({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    destination: '',
    country: 'India',
    startDate: '',
    endDate: '',
    budget: '',
    travellers: 2,
    coverStyle: 'city',
    status: 'planning',
    notes: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.destination.trim() || !form.startDate || !form.endDate || form.budget === '') {
      setError('Title, destination, dates and budget are all required.');
      return;
    }
    if (form.endDate < form.startDate) {
      setError('End date must be on or after the start date.');
      return;
    }
    setBusy(true);
    try {
      const { trip } = await api.createTrip({ ...form, budget: Number(form.budget), travellers: Number(form.travellers) });
      onCreated(trip);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={submit} noValidate>
      <div className="form-grid">
        <label className="field">
          <span>Trip title *</span>
          <input value={form.title} onChange={set('title')} placeholder="e.g. Rajasthan Heritage Trail" autoFocus />
        </label>
        <label className="field">
          <span>Destination *</span>
          <input value={form.destination} onChange={set('destination')} placeholder="e.g. Jaipur, Rajasthan" />
        </label>
        <label className="field">
          <span>Start date *</span>
          <input type="date" value={form.startDate} onChange={set('startDate')} />
        </label>
        <label className="field">
          <span>End date *</span>
          <input type="date" value={form.endDate} onChange={set('endDate')} />
        </label>
        <label className="field">
          <span>Budget (₹) *</span>
          <input type="number" min="0" value={form.budget} onChange={set('budget')} placeholder="45000" />
        </label>
        <label className="field">
          <span>Travellers</span>
          <input type="number" min="1" value={form.travellers} onChange={set('travellers')} />
        </label>
        <label className="field">
          <span>Cover style</span>
          <select value={form.coverStyle} onChange={set('coverStyle')}>
            {COVER_STYLES.map((c) => (
              <option key={c} value={c}>{COVER_LABELS[c]}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select value={form.status} onChange={set('status')}>
            {TRIP_STATUSES.map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
        </label>
        <label className="field field-wide">
          <span>Notes</span>
          <textarea value={form.notes} onChange={set('notes')} rows="2" placeholder="Anything worth remembering about this trip" />
        </label>
      </div>
      {error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : null}
      <div className="dialog-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create trip'}</button>
      </div>
    </form>
  );
}

function AuthView({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    if (mode === 'register' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!email.includes('@') || password.length < 8) {
      setError('Enter a valid email and a password of at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const { token, user } =
        mode === 'login'
          ? await api.login({ email, password })
          : await api.register({ name, email, password });
      setToken(token);
      onAuth(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function fillDemo() {
    setMode('login');
    setEmail(config.demoEmail);
    setPassword(config.demoPassword);
    setStatus('Demo account filled in — press Sign in.');
  }

  return (
    <main className="auth-page">
      <section className="auth-split">
        <div className="auth-copy">
          <p className="label">(01) — TRAVEL, PLANNED PROPERLY</p>
          <h1>
            Plan the trip, <em>not the spreadsheet.</em>
          </h1>
          <p className="lede">
            Voyara turns a trip into a day-by-day plan: timed activities that cannot clash,
            a live budget that warns before it breaks, a packing list that fills itself,
            and a plan your co-travellers can see change as it happens.
          </p>
          <ul className="auth-points">
            <li><strong>01</strong> Day-by-day itinerary with clash detection</li>
            <li><strong>02</strong> Live budget burn-down, in rupees</li>
            <li><strong>03</strong> Packing checklist with templates</li>
            <li><strong>04</strong> Share with co-travellers, live</li>
          </ul>
        </div>
        <div className="auth-panel">
          <h2>{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
          <form onSubmit={submit} noValidate>
            {mode === 'register' ? (
              <label className="field">
                <span>Your name *</span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </label>
            ) : null}
            <label className="field">
              <span>Email *</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </label>
            <label className="field">
              <span>Password *</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>
            {error ? (
              <p className="form-error" role="alert">{error}</p>
            ) : null}
            {status ? (
              <p className="form-status" role="status">{status}</p>
            ) : null}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <button type="button" className="btn btn-ghost btn-block" onClick={fillDemo}>
            Use the demo account
          </button>
          <p className="auth-switch">
            {mode === 'login' ? 'New here? ' : 'Already have an account? '}
            <button type="button" className="link-btn" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
          <p className="auth-demo-note">
            Demo account: <code>{config.demoEmail}</code> / <code>{config.demoPassword}</code>.
            It ships with three sample trips (Rajasthan, Himachal, Goa) — all labelled sample data.
          </p>
        </div>
      </section>
      <footer className="site-footer">
        <span>© 2026 Akhand</span>
        <span>Voyara — a demo travel planner. No real bookings or payments.</span>
      </footer>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [view, setView] = useState({ name: 'dashboard' });
  const [trips, setTrips] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('departure');
  const [showNew, setShowNew] = useState(false);
  const [status, setStatus] = useState('');

  const loadTrips = useCallback(async () => {
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (statusFilter) params.status = statusFilter;
    if (sort) params.sort = sort;
    const { trips: list } = await api.trips(params);
    setTrips(list);
  }, [search, statusFilter, sort]);

  useEffect(() => {
    // No stored token: stay on the sign-in view without calling /auth/me,
    // so a logged-out landing load makes no failing request.
    if (!localStorage.getItem('voyara_token')) {
      setChecking(false);
      return;
    }
    (async () => {
      try {
        const { user: me } = await api.me();
        setUser(me);
        connectSocket(me.id);
      } catch {
        setUser(null);
      } finally {
        setChecking(false);
      }
    })();
    return () => {
      if (socket) socket.disconnect();
      socket = null;
    };
  }, []);

  useEffect(() => {
    if (user) loadTrips().catch(() => setStatus('Could not load trips. Check the API is running.'));
  }, [user, loadTrips]);

  function handleAuth(me) {
    setUser(me);
    connectSocket(me.id);
    setView({ name: 'dashboard' });
  }

  function signOut() {
    setToken(null);
    if (socket) socket.disconnect();
    socket = null;
    setUser(null);
    setTrips([]);
    setView({ name: 'dashboard' });
  }

  if (checking) {
    return (
      <div className="loading">
        <p>Loading Voyara…</p>
      </div>
    );
  }
  if (!user) return <AuthView onAuth={handleAuth} />;

  const upcoming = trips
    .filter((t) => t.status === 'upcoming' || t.status === 'planning')
    .slice()
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to main content</a>
      <Cursor />
      <header className="topbar">
        <button type="button" className="brand" onClick={() => setView({ name: 'dashboard' })}>
          Voyara<span className="brand-dot">.</span>
        </button>
        <nav aria-label="Main">
          <button type="button" className="nav-link" onClick={() => setView({ name: 'dashboard' })}>My trips</button>
          <button type="button" className="nav-link" onClick={() => setShowNew(true)}>+ New trip</button>
        </nav>
        <div className="topbar-user">
          <span>{user.name}</span>
          <button type="button" className="btn btn-ghost btn-small" onClick={signOut}>Sign out</button>
        </div>
      </header>

      {view.name === 'trip' ? (
        <TripDetail
          tripId={view.id}
          onBack={() => setView({ name: 'dashboard' })}
          onChanged={loadTrips}
          currentUser={user}
        />
      ) : (
        <main id="main" className="dashboard">
          <section className="hero">
            <div className="hero-copy">
              <p className="label">(01) — YOUR TRIPS</p>
              <h1>
                Every journey, <em>on one page.</em>
              </h1>
              <p className="lede">
                {trips.length === 0
                  ? 'No trips yet — create your first one and Voyara builds the day-by-day plan for you.'
                  : `${trips.length} trip${trips.length === 1 ? '' : 's'} planned. Pick one to open its timeline, budget and packing list.`}
              </p>
              <button type="button" className="btn btn-primary" onClick={() => setShowNew(true)}>
                Plan a new trip
              </button>
            </div>
            <div className="hero-panel" aria-label="Next departure">
              {upcoming ? (
                <>
                  <p className="label label-light">(02) — NEXT DEPARTURE</p>
                  <p className="hero-destination">{upcoming.destination}</p>
                  <p className="hero-countdown">{daysUntil(upcoming.startDate)}</p>
                  <p className="hero-dates">
                    {formatDate(upcoming.startDate)} — {formatDate(upcoming.endDate)} · {upcoming.dayCount} days
                  </p>
                  <p className="hero-budget">Budget {inr(upcoming.budget)} · {upcoming.travellers} traveller{upcoming.travellers === 1 ? '' : 's'}</p>
                  <button type="button" className="btn btn-light" onClick={() => setView({ name: 'trip', id: upcoming.id })}>
                    Open this trip →
                  </button>
                </>
              ) : (
                <>
                  <p className="label label-light">(02) — NEXT DEPARTURE</p>
                  <p className="hero-destination">Nothing on the calendar</p>
                  <p className="hero-countdown">—</p>
                  <p className="hero-dates">Create a trip to see its countdown here.</p>
                </>
              )}
            </div>
          </section>

          <section className="trips-section" aria-label="Trip list">
            <div className="section-head">
              <h2>
                <span className="section-num">(03)</span> Trips
              </h2>
              <p className="section-note">Sample trips are labelled “Sample”.</p>
            </div>
            <div className="filters" role="search">
              <label className="field field-inline">
                <span className="visually-hidden">Search trips</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search destination or title…"
                  aria-label="Search trips by destination or title"
                />
              </label>
              <label className="field field-inline">
                <span className="visually-hidden">Filter by status</span>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
                  <option value="">All statuses</option>
                  {TRIP_STATUSES.map((s) => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </select>
              </label>
              <label className="field field-inline">
                <span className="visually-hidden">Sort trips</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort trips">
                  <option value="departure">Sort: departure date</option>
                  <option value="created">Sort: recently created</option>
                </select>
              </label>
            </div>
            {status ? (
              <p className="form-status" role="status">{status}</p>
            ) : null}
            {trips.length === 0 ? (
              <p className="empty-state">No trips match. Try clearing the filters, or plan a new trip.</p>
            ) : (
              <ul className="trip-rows">
                {trips.map((t, i) => (
                  <li key={t.id} className="trip-row">
                    <button type="button" className="trip-row-main" onClick={() => setView({ name: 'trip', id: t.id })}>
                      <span className={`cover-band cover-${t.coverStyle}`} aria-hidden="true">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="trip-row-text">
                        <span className="trip-row-title">
                          {t.title}
                          {t.demo ? <span className="tag tag-sample">Sample</span> : null}
                        </span>
                        <span className="trip-row-meta">
                          {t.destination} · {formatDateShort(t.startDate)} – {formatDateShort(t.endDate)} · {t.dayCount} days · {t.travellers} traveller{t.travellers === 1 ? '' : 's'}
                        </span>
                      </span>
                      <span className="trip-row-side">
                        <span className={`status-pill status-${t.status}`}>{statusLabel(t.status)}</span>
                        <span className="trip-row-budget">{inr(t.budget)}</span>
                        <span className="trip-row-countdown">{daysUntil(t.startDate)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <footer className="site-footer">
            <span>© 2026 Akhand</span>
            <span>Voyara — a demo travel planner. No real bookings or payments.</span>
          </footer>
        </main>
      )}

      {showNew ? (
        <Dialog title="Plan a new trip" onClose={() => setShowNew(false)}>
          <NewTripForm
            onClose={() => setShowNew(false)}
            onCreated={(trip) => {
              setShowNew(false);
              loadTrips();
              setView({ name: 'trip', id: trip.id });
            }}
          />
        </Dialog>
      ) : null}
    </div>
  );
}
