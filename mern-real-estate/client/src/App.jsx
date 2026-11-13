import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  api, setToken, inr, inrShort, emiLocal,
  PROPERTY_TYPES, PROPERTY_STATUSES, AMENITY_OPTIONS,
} from './api.js';
import { config, TYPE_LABELS, STATUS_LABELS } from './data/config.js';
import Cursor from './components/Cursor.jsx';
import Dialog from './components/Dialog.jsx';
import PropertyArt from './components/PropertyArt.jsx';

let socket = null;
function connectSocket(userId) {
  if (socket) socket.disconnect();
  socket = io('/', { auth: { userId } });
  return socket;
}

const EMPTY_FILTERS = { q: '', city: '', type: '', minPrice: '', maxPrice: '', minBeds: '', minArea: '', amenities: [], status: '' };

function Toasts({ toasts }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast" role="status">{t.text}</div>
      ))}
    </div>
  );
}

// Live EMI calculator: sliders update the figure instantly (local formula),
// and "Check with server" confirms the same figure from the API.
function EmiCalculator({ initialPrice }) {
  const [principal, setPrincipal] = useState(initialPrice || 5000000);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);
  const [serverEmi, setServerEmi] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const local = emiLocal(principal, rate, years);
  const total = local * years * 12;

  async function checkServer() {
    setError('');
    setBusy(true);
    try {
      const r = await api.emi({ principal, annualRate: rate, years });
      setServerEmi(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="emi-box">
      <p className="label">(EMI) — WORK OUT THE MONTHLY COST</p>
      <p className="emi-big">{inr(local)}<span> / month</span></p>
      <p className="emi-sub">Total over {years} years: {inr(total)} · interest {inr(total - principal)}</p>
      <label className="field">
        <span>Loan amount — {inr(principal)}</span>
        <input type="range" min="500000" max="30000000" step="100000" value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} aria-label="Loan amount" />
      </label>
      <label className="field">
        <span>Interest rate — {rate}% per year</span>
        <input type="range" min="5" max="15" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label="Interest rate" />
      </label>
      <label className="field">
        <span>Tenure — {years} years</span>
        <input type="range" min="5" max="30" step="1" value={years} onChange={(e) => setYears(Number(e.target.value))} aria-label="Loan tenure in years" />
      </label>
      <button type="button" className="btn btn-ghost btn-small" onClick={checkServer} disabled={busy}>
        {busy ? 'Checking…' : 'Check this figure with the server'}
      </button>
      {serverEmi ? (
        <p className="form-status" role="status">
          Server agrees: {inr(serverEmi.monthlyEmi)} / month · total interest {inr(serverEmi.totalInterest)}.
        </p>
      ) : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <p className="fine-print">Indicative only — a loan estimate, not an offer. Rates and eligibility come from the lender.</p>
    </div>
  );
}

function PropertyForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(
    initial || {
      title: '', type: 'apartment', city: '', locality: '', price: '',
      beds: 2, baths: 2, areaSqft: '', amenities: [], status: 'available', description: '',
    }
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  function toggleAmenity(a) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));
  }
  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.city.trim() || !form.locality.trim() || !form.price || !form.areaSqft) {
      setError('Title, city, locality, price and area are all required.');
      return;
    }
    setBusy(true);
    try {
      const payload = { ...form, price: Number(form.price), beds: Number(form.beds), baths: Number(form.baths), areaSqft: Number(form.areaSqft) };
      const result = initial
        ? await api.updateProperty(initial.id, payload)
        : await api.createProperty(payload);
      onSaved(result.property);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      <div className="form-grid">
        <label className="field"><span>Title *</span><input value={form.title} onChange={set('title')} placeholder="e.g. Sunrise 2BHK near the old city" autoFocus /></label>
        <label className="field"><span>Type *</span>
          <select value={form.type} onChange={set('type')}>{PROPERTY_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select>
        </label>
        <label className="field"><span>City *</span><input value={form.city} onChange={set('city')} placeholder="e.g. Lucknow" /></label>
        <label className="field"><span>Locality *</span><input value={form.locality} onChange={set('locality')} placeholder="e.g. Gomti Nagar" /></label>
        <label className="field"><span>Price (₹) *</span><input type="number" min="0" value={form.price} onChange={set('price')} placeholder="7800000" /></label>
        <label className="field"><span>Area (sq ft) *</span><input type="number" min="0" value={form.areaSqft} onChange={set('areaSqft')} placeholder="1650" /></label>
        <label className="field"><span>Bedrooms</span><input type="number" min="0" value={form.beds} onChange={set('beds')} /></label>
        <label className="field"><span>Bathrooms</span><input type="number" min="0" value={form.baths} onChange={set('baths')} /></label>
        <label className="field"><span>Status</span>
          <select value={form.status} onChange={set('status')}>{PROPERTY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select>
        </label>
        <fieldset className="field field-wide amenity-field">
          <legend>Amenities</legend>
          <div className="amenity-chips">
            {AMENITY_OPTIONS.map((a) => (
              <button key={a} type="button" className={`chip ${form.amenities.includes(a) ? 'is-on' : ''}`} onClick={() => toggleAmenity(a)} aria-pressed={form.amenities.includes(a)}>{a}</button>
            ))}
          </div>
        </fieldset>
        <label className="field field-wide"><span>Description</span><textarea value={form.description} onChange={set('description')} rows="3" placeholder="A short, honest description of the home" /></label>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="dialog-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'List this property'}</button>
      </div>
    </form>
  );
}

function AuthView({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('buyer');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    if (mode === 'register' && !name.trim()) { setError('Please enter your name.'); return; }
    if (!email.includes('@') || password.length < 8) {
      setError('Enter a valid email and a password of at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const { token, user } = mode === 'login'
        ? await api.login({ email, password })
        : await api.register({ name, email, password, role });
      setToken(token);
      onAuth(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function fillDemo(which) {
    setMode('login');
    setEmail(which === 'agent' ? config.demoAgentEmail : which === 'admin' ? config.demoAdminEmail : config.demoEmail);
    setPassword(config.demoPassword);
    setStatus('Demo account filled in — press Sign in.');
  }

  return (
    <main className="auth-page">
      <section className="auth-split">
        <div className="auth-copy">
          <p className="label">(01) — HOMES, PRICED HONESTLY</p>
          <h1>
            Find a place <em>that fits.</em>
          </h1>
          <p className="lede">
            NestHunt lists homes across Indian cities with the numbers that matter:
            price per square foot by locality, a live EMI calculator, and side-by-side
            comparison — so you compare facts, not brochures.
          </p>
          <ul className="auth-points">
            <li><strong>01</strong> Search by city, price, beds and amenities</li>
            <li><strong>02</strong> Price-per-sqft analytics from real listings</li>
            <li><strong>03</strong> EMI calculator with live sliders</li>
            <li><strong>04</strong> Saved searches that alert you to new matches</li>
          </ul>
        </div>
        <div className="auth-panel">
          <h2>{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
          <form onSubmit={submit} noValidate>
            {mode === 'register' ? (
              <>
                <label className="field"><span>Your name *</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
                <label className="field"><span>I am a *</span>
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="buyer">Buyer — I am looking for a home</option>
                    <option value="agent">Agent — I list properties</option>
                  </select>
                </label>
              </>
            ) : null}
            <label className="field"><span>Email *</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
            <label className="field"><span>Password *</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            {status ? <p className="form-status" role="status">{status}</p> : null}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <div className="demo-buttons">
            <button type="button" className="btn btn-ghost btn-block" onClick={() => fillDemo('buyer')}>Use the demo buyer</button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => fillDemo('agent')}>Use the demo agent</button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => fillDemo('admin')}>Use the demo admin</button>
          </div>
          <p className="auth-switch">
            {mode === 'login' ? 'New here? ' : 'Already have an account? '}
            <button type="button" className="link-btn" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
          <p className="auth-demo-note">
            Demo accounts (password <code>{config.demoPassword}</code>): buyer <code>{config.demoEmail}</code>,
            agent <code>{config.demoAgentEmail}</code>, admin <code>{config.demoAdminEmail}</code>.
            The 8 seeded listings are sample data for demonstration.
          </p>
        </div>
      </section>
      <footer className="site-footer">
        <span>© 2026 Akhand</span>
        <span>NestHunt — a demo listing platform. No real properties, prices or payments.</span>
      </footer>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [view, setView] = useState({ name: 'browse' });
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(true);
  const [favourites, setFavourites] = useState([]);
  const [compareIds, setCompareIds] = useState([]);
  const [compareData, setCompareData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [savedSearches, setSavedSearches] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [adminData, setAdminData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showForm, setShowForm] = useState(null);
  const [status, setStatus] = useState('');
  const [toasts, setToasts] = useState([]);
  const [saveSearchName, setSaveSearchName] = useState('');
  const toastId = useRef(0);

  const pushToast = useCallback((text) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  const loadProperties = useCallback(async () => {
    const params = { sort };
    if (filters.q.trim()) params.q = filters.q.trim();
    if (filters.city.trim()) params.city = filters.city.trim();
    if (filters.type) params.type = filters.type;
    if (filters.minPrice !== '') params.minPrice = filters.minPrice;
    if (filters.maxPrice !== '') params.maxPrice = filters.maxPrice;
    if (filters.minBeds !== '') params.minBeds = filters.minBeds;
    if (filters.minArea !== '') params.minArea = filters.minArea;
    if (filters.amenities.length) params.amenities = filters.amenities.join(',');
    if (filters.status) params.status = filters.status;
    const data = await api.properties(params);
    setProperties(data.properties);
    setTotal(data.total);
  }, [filters, sort]);

  const loadFavourites = useCallback(async () => {
    try {
      const { properties: favs } = await api.favourites();
      setFavourites(favs.map((p) => p.id));
    } catch { /* favourites load is non-blocking */ }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('nesthunt_token')) {
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
    if (!user) return;
    loadProperties().catch(() => setStatus('Could not load listings. Check the API is running.'));
    loadFavourites();
  }, [user, loadProperties, loadFavourites]);

  // Live socket events: saved-search matches, enquiry replies, new listings.
  useEffect(() => {
    if (!socket || !user) return undefined;
    const onMatch = (d) => {
      pushToast(`New match for “${d.searchName}”: ${d.property.title} — ${inr(d.property.price)} in ${d.property.locality}, ${d.property.city}.`);
      loadProperties();
    };
    const onCreated = (d) => {
      pushToast(`New listing: ${d.property.title} — ${inr(d.property.price)} in ${d.property.city}.`);
      loadProperties();
    };
    const onReply = (d) => pushToast(`Reply on “${d.propertyTitle}”: ${d.reply}`);
    const onEnquiry = (d) => {
      pushToast(`New enquiry on “${d.propertyTitle}” from ${d.fromName}.`);
      loadEnquiries();
    };
    socket.on('saved-search-match', onMatch);
    socket.on('property-created', onCreated);
    socket.on('enquiry-replied', onReply);
    socket.on('enquiry-received', onEnquiry);
    return () => {
      socket.off('saved-search-match', onMatch);
      socket.off('property-created', onCreated);
      socket.off('enquiry-replied', onReply);
      socket.off('enquiry-received', onEnquiry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pushToast]);

  // Reveal: curtain overlay slides away when a section scrolls into view.
  // Content is fully visible by default — the curtain only exists after JS adds it.
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          obs.unobserve(en.target);
        }
      }),
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [view, properties]);

  const loadEnquiries = useCallback(async () => {
    try {
      const { enquiries: list } = await api.enquiries();
      setEnquiries(list);
    } catch { /* non-blocking */ }
  }, []);

  function handleAuth(me) {
    setUser(me);
    connectSocket(me.id);
    setView({ name: 'browse' });
  }

  function signOut() {
    setToken(null);
    if (socket) socket.disconnect();
    socket = null;
    setUser(null);
    setProperties([]);
    setFavourites([]);
    setCompareIds([]);
    setView({ name: 'browse' });
  }

  async function toggleFavourite(id) {
    try {
      if (favourites.includes(id)) {
        await api.removeFavourite(id);
        setFavourites((f) => f.filter((x) => x !== id));
      } else {
        await api.addFavourite(id);
        setFavourites((f) => [...f, id]);
      }
    } catch (err) {
      setStatus(err.message);
    }
  }

  function toggleCompare(id) {
    setCompareIds((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id);
      if (ids.length >= 3) {
        setStatus('Compare holds at most 3 properties — remove one first.');
        return ids;
      }
      return [...ids, id];
    });
  }

  async function openCompare() {
    try {
      const data = await api.compare(compareIds);
      setCompareData(data);
      setView({ name: 'compare' });
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function openAnalytics() {
    try {
      const data = await api.priceAnalytics();
      setAnalytics(data);
      setView({ name: 'analytics' });
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function openSaved() {
    try {
      const { searches } = await api.savedSearches();
      setSavedSearches(searches);
      setView({ name: 'saved' });
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function openFavourites() {
    try {
      const { properties: favs } = await api.favourites();
      setView({ name: 'favourites', list: favs });
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function openAgent() {
    await loadEnquiries();
    setView({ name: 'agent' });
  }

  async function openAdmin() {
    try {
      const data = await api.adminOverview();
      setAdminData(data);
      setView({ name: 'admin' });
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function saveCurrentSearch() {
    if (!saveSearchName.trim()) { setStatus('Name the saved search first.'); return; }
    try {
      const clean = {
        city: filters.city.trim(),
        type: filters.type,
        minPrice: filters.minPrice === '' ? null : Number(filters.minPrice),
        maxPrice: filters.maxPrice === '' ? null : Number(filters.maxPrice),
        minBeds: filters.minBeds === '' ? null : Number(filters.minBeds),
      };
      const { search } = await api.createSavedSearch({ name: saveSearchName.trim(), filters: clean });
      setSavedSearches((s) => [search, ...s]);
      setSaveSearchName('');
      setStatus(`Saved search “${search.name}” created — you will be alerted when a matching home is listed.`);
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function deleteSavedSearch(id) {
    try {
      await api.deleteSavedSearch(id);
      setSavedSearches((s) => s.filter((x) => x.id !== id));
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function deleteProperty(id) {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    try {
      await api.deleteProperty(id);
      loadProperties();
      setStatus('Listing deleted.');
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function replyToEnquiry(id, message) {
    try {
      await api.replyEnquiry(id, { message });
      loadEnquiries();
      setStatus('Reply sent.');
    } catch (err) {
      setStatus(err.message);
    }
  }

  if (checking) {
    return (
      <div className="loading">
        <p>Loading NestHunt…</p>
      </div>
    );
  }
  if (!user) return <AuthView onAuth={handleAuth} />;

  const myListings = properties.filter((p) => p.agent && p.agent.id === user.id);
  const cheapest = properties.length ? properties.reduce((a, b) => (b.price < a.price ? b : a)) : null;
  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const toggleAmenityFilter = (a) => setFilters((f) => ({
    ...f,
    amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
  }));

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to main content</a>
      <Cursor />
      <Toasts toasts={toasts} />
      <header className="topbar">
        <button type="button" className="brand" onClick={() => setView({ name: 'browse' })}>
          NestHunt<span className="brand-dot">.</span>
        </button>
        <nav aria-label="Main">
          <button type="button" className="nav-link" onClick={() => setView({ name: 'browse' })}>Browse</button>
          <button type="button" className="nav-link" onClick={openAnalytics}>Price analytics</button>
          <button type="button" className="nav-link" onClick={openSaved}>Saved searches</button>
          <button type="button" className="nav-link" onClick={openFavourites}>Favourites</button>
          {user.role !== 'buyer' ? <button type="button" className="nav-link" onClick={openAgent}>My listings</button> : null}
          {user.role === 'admin' ? <button type="button" className="nav-link" onClick={openAdmin}>Admin</button> : null}
        </nav>
        <div className="topbar-user">
          <span>{user.name} · {user.role}</span>
          <button type="button" className="btn btn-ghost btn-small" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <main id="main">
        {view.name === 'browse' ? (
          <div className="browse-page">
            <section className="hero" data-reveal>
              <div className="hero-copy">
                <p className="label">(01) — BROWSE HOMES</p>
                <h1>
                  Find a place <em>that fits.</em>
                </h1>
                <p className="lede">
                  {total} listing{total === 1 ? '' : 's'} on the board right now. Filter by city,
                  price and bedrooms, compare up to three side by side, and check what each
                  locality really costs per square foot.
                </p>
                <div className="hero-actions">
                  <button type="button" className="btn btn-primary" onClick={() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })}>Browse listings</button>
                  <button type="button" className="btn btn-ghost" onClick={openAnalytics}>See price analytics</button>
                </div>
              </div>
              <div className="hero-panel" aria-label="Cheapest listing">
                {cheapest ? (
                  <>
                    <p className="label label-light">(02) — LOWEST PRICE ON THE BOARD</p>
                    <p className="hero-price">{inr(cheapest.price)}</p>
                    <p className="hero-destination">{cheapest.title}</p>
                    <p className="hero-meta">{cheapest.locality}, {cheapest.city} · {cheapest.beds} bed · {cheapest.areaSqft.toLocaleString('en-IN')} sq ft · {inr(cheapest.pricePerSqft)}/sq ft</p>
                    <button type="button" className="btn btn-light" onClick={() => setDetail(cheapest)}>Open this home →</button>
                  </>
                ) : (
                  <>
                    <p className="label label-light">(02) — LOWEST PRICE ON THE BOARD</p>
                    <p className="hero-destination">No listings yet</p>
                    <p className="hero-meta">Be the first agent to list a home.</p>
                  </>
                )}
              </div>
            </section>

            <section className="filters-section" aria-label="Search and filters" data-reveal>
              <div className="section-head">
                <h2><span className="section-num">(03)</span> Search</h2>
                <button type="button" className="link-btn" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
                  {showFilters ? 'Hide filters' : 'Show filters'}
                </button>
              </div>
              <div className={`filter-panel ${showFilters ? 'is-open' : ''}`}>
                <div className="filters-grid">
                  <label className="field"><span>Search title, locality or city</span>
                    <input type="search" value={filters.q} onChange={setF('q')} placeholder="e.g. Gomti Nagar" aria-label="Search by title, locality or city" />
                  </label>
                  <label className="field"><span>City</span><input value={filters.city} onChange={setF('city')} placeholder="e.g. Lucknow" /></label>
                  <label className="field"><span>Type</span>
                    <select value={filters.type} onChange={setF('type')}>
                      <option value="">All types</option>
                      {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Min price (₹)</span><input type="number" min="0" value={filters.minPrice} onChange={setF('minPrice')} placeholder="2000000" /></label>
                  <label className="field"><span>Max price (₹)</span><input type="number" min="0" value={filters.maxPrice} onChange={setF('maxPrice')} placeholder="10000000" /></label>
                  <label className="field"><span>Min bedrooms</span><input type="number" min="0" value={filters.minBeds} onChange={setF('minBeds')} placeholder="2" /></label>
                  <label className="field"><span>Min area (sq ft)</span><input type="number" min="0" value={filters.minArea} onChange={setF('minArea')} placeholder="1000" /></label>
                  <label className="field"><span>Status</span>
                    <select value={filters.status} onChange={setF('status')}>
                      <option value="">Any status</option>
                      {PROPERTY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Sort</span>
                    <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort listings">
                      <option value="newest">Newest first</option>
                      <option value="price-asc">Price: low to high</option>
                      <option value="price-desc">Price: high to low</option>
                      <option value="area-desc">Largest area first</option>
                    </select>
                  </label>
                </div>
                <fieldset className="field amenity-field">
                  <legend>Must have</legend>
                  <div className="amenity-chips">
                    {AMENITY_OPTIONS.map((a) => (
                      <button key={a} type="button" className={`chip ${filters.amenities.includes(a) ? 'is-on' : ''}`} onClick={() => toggleAmenityFilter(a)} aria-pressed={filters.amenities.includes(a)}>{a}</button>
                    ))}
                  </div>
                </fieldset>
                <p className="result-count" role="status" aria-live="polite">
                  {total} home{total === 1 ? '' : 's'} match{total === 1 ? 'es' : ''} these filters — updating as you type.
                </p>
                <div className="save-search-row">
                  <label className="field field-inline">
                    <span className="visually-hidden">Name for this saved search</span>
                    <input value={saveSearchName} onChange={(e) => setSaveSearchName(e.target.value)} placeholder="Name this search, e.g. 2BHK in Lucknow" aria-label="Name for this saved search" />
                  </label>
                  <button type="button" className="btn btn-primary btn-small" onClick={saveCurrentSearch}>Save this search + alert me</button>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => { setFilters(EMPTY_FILTERS); setSort('newest'); }}>Clear all filters</button>
                </div>
              </div>
            </section>

            <section id="results" aria-label="Listings" data-reveal>
              <div className="section-head">
                <h2><span className="section-num">(04)</span> Listings</h2>
                <p className="section-note">Drawings are illustrative previews, not photos. Sample listings are labelled “Sample”.</p>
              </div>
              {status ? <p className="form-status" role="status">{status}</p> : null}
              {properties.length === 0 ? (
                <p className="empty-state">No homes match. Try widening the price range or clearing a filter.</p>
              ) : (
                <ul className="prop-rows">
                  {properties.map((p, i) => (
                    <li key={p.id} className="prop-row">
                      <button type="button" className="prop-row-main" onClick={() => setDetail(p)}>
                        <span className="prop-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                        <span className="prop-art-wrap"><PropertyArt type={p.type} label={p.title} /></span>
                        <span className="prop-row-text">
                          <span className="prop-row-title">
                            {p.title}
                            {p.demo ? <span className="tag tag-sample">Sample</span> : null}
                            <span className={`status-pill status-${p.status}`}>{STATUS_LABELS[p.status]}</span>
                          </span>
                          <span className="prop-row-meta">
                            {TYPE_LABELS[p.type]} · {p.locality}, {p.city} · {p.beds} bed · {p.baths} bath · {p.areaSqft.toLocaleString('en-IN')} sq ft
                          </span>
                          <span className="prop-row-amen">{(p.amenities || []).join(' · ') || 'No amenities listed'}</span>
                        </span>
                        <span className="prop-row-side">
                          <span className="prop-price">{inr(p.price)}</span>
                          <span className="prop-ppsf">{inr(p.pricePerSqft)} / sq ft</span>
                          <span className="prop-agent">Listed by {p.agent?.name || '—'}</span>
                        </span>
                      </button>
                      <span className="prop-row-actions">
                        <button type="button" className={`btn btn-small ${favourites.includes(p.id) ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleFavourite(p.id)} aria-pressed={favourites.includes(p.id)}>
                          {favourites.includes(p.id) ? '♥ Saved' : '♡ Save'}
                        </button>
                        <button type="button" className={`btn btn-small ${compareIds.includes(p.id) ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleCompare(p.id)} aria-pressed={compareIds.includes(p.id)}>
                          {compareIds.includes(p.id) ? '✓ Comparing' : '+ Compare'}
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="emi-section" aria-label="EMI calculator" data-reveal>
              <div className="emi-split">
                <div className="emi-copy">
                  <p className="label">(05) — CAN YOU AFFORD IT?</p>
                  <h2>Work out the EMI <em>before you fall for the home.</em></h2>
                  <p className="lede">Drag the sliders and the monthly figure updates instantly. The server checks the same maths when you ask it to.</p>
                </div>
                <EmiCalculator initialPrice={cheapest ? cheapest.price : 5000000} />
              </div>
            </section>
          </div>
        ) : null}

        {view.name === 'compare' && compareData ? (
          <div className="page">
            <div className="page-head">
              <p className="label">(01) — SIDE BY SIDE</p>
              <h1>Compare, <em>not guess.</em></h1>
              <p className="lede">The summary below is computed on the server from the listings themselves.</p>
              <button type="button" className="btn btn-ghost" onClick={() => setView({ name: 'browse' })}>← Back to browse</button>
            </div>
            <div className="compare-summary" role="status">
              {compareData.properties.map((p) => {
                const s = compareData.summary;
                const wins = [];
                if (s.cheapestId === p.id) wins.push('Cheapest');
                if (s.largestAreaId === p.id) wins.push('Largest area');
                if (s.bestValueId === p.id) wins.push('Best price per sq ft');
                if (s.mostBedsId === p.id) wins.push('Most bedrooms');
                return wins.length ? (
                  <p key={p.id}><strong>{p.title}</strong> — {wins.join(' · ')}</p>
                ) : null;
              })}
            </div>
            <div className="compare-table-wrap">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th scope="col">Detail</th>
                    {compareData.properties.map((p) => <th key={p.id} scope="col">{p.title}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Price', (p) => inr(p.price)],
                    ['Price per sq ft', (p) => `${inr(p.pricePerSqft)} / sq ft`],
                    ['Type', (p) => TYPE_LABELS[p.type]],
                    ['City', (p) => `${p.locality}, ${p.city}`],
                    ['Bedrooms', (p) => p.beds],
                    ['Bathrooms', (p) => p.baths],
                    ['Area', (p) => `${p.areaSqft.toLocaleString('en-IN')} sq ft`],
                    ['Status', (p) => STATUS_LABELS[p.status]],
                    ['Amenities', (p) => (p.amenities || []).join(', ') || '—'],
                    ['Listed by', (p) => p.agent?.name || '—'],
                  ].map(([label, fn]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      {compareData.properties.map((p) => <td key={p.id}>{fn(p)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="fine-print">EMI for each home can be checked from its detail view.</p>
          </div>
        ) : null}

        {view.name === 'analytics' && analytics ? (
          <div className="page">
            <div className="page-head">
              <p className="label">(01) — PRICE ANALYTICS</p>
              <h1>What each locality <em>really costs.</em></h1>
              <p className="lede">Every figure below is an average computed from the listings on the board — nothing invented.</p>
              <button type="button" className="btn btn-ghost" onClick={() => setView({ name: 'browse' })}>← Back to browse</button>
            </div>
            <section data-reveal>
              <div className="section-head"><h2><span className="section-num">(02)</span> Price per sq ft by locality</h2></div>
              {analytics.byLocality.length === 0 ? <p className="empty-state">No listings yet.</p> : (
                <div className="bars" role="img" aria-label="Bar chart of average price per square foot by locality">
                  {(() => {
                    const max = Math.max(...analytics.byLocality.map((r) => r.avgPricePerSqft || 0), 1);
                    return analytics.byLocality.map((r) => (
                      <div key={r.locality} className="bar-row">
                        <span className="bar-label">{r.locality}, {r.city} <span className="bar-count">({r.count} listing{r.count === 1 ? '' : 's'})</span></span>
                        <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.max(4, (r.avgPricePerSqft / max) * 100)}%` }} /></span>
                        <span className="bar-value">{inr(r.avgPricePerSqft)} / sq ft · avg {inrShort(r.avgPrice)}</span>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </section>
            <section className="analytics-split" data-reveal>
              <div>
                <div className="section-head"><h2><span className="section-num">(03)</span> Listings by type</h2></div>
                <ul className="stat-list">
                  {analytics.byType.map((r) => (
                    <li key={r.type}><span>{TYPE_LABELS[r.type]}</span><strong>{r.count}</strong><span>avg {inrShort(r.avgPrice)}</span></li>
                  ))}
                </ul>
              </div>
              <div className="analytics-dark">
                <p className="label label-light">(04) — BY CITY</p>
                <ul className="stat-list stat-list-dark">
                  {analytics.byCity.map((r) => (
                    <li key={r.city}><span>{r.city}</span><strong>{r.count}</strong><span>avg {inrShort(r.avgPrice)}</span></li>
                  ))}
                </ul>
                <p className="label label-light" style={{ marginTop: 28 }}>(05) — AVERAGE PRICE BY BEDROOMS</p>
                <ul className="stat-list stat-list-dark">
                  {analytics.byBeds.map((r) => (
                    <li key={r.beds}><span>{r.beds} bed{r.beds === 1 ? '' : 's'}</span><strong>{r.count}</strong><span>avg {inrShort(r.avgPrice)}</span></li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        ) : null}

        {view.name === 'saved' ? (
          <div className="page">
            <div className="page-head">
              <p className="label">(01) — SAVED SEARCHES</p>
              <h1>We watch the board <em>for you.</em></h1>
              <p className="lede">When an agent lists a home that matches a saved search, you get a live alert here.</p>
              <button type="button" className="btn btn-ghost" onClick={() => setView({ name: 'browse' })}>← Back to browse</button>
            </div>
            {status ? <p className="form-status" role="status">{status}</p> : null}
            {savedSearches.length === 0 ? (
              <p className="empty-state">No saved searches yet. Set your filters on Browse, name the search and save it.</p>
            ) : (
              <ul className="saved-list">
                {savedSearches.map((s) => (
                  <li key={s.id}>
                    <div>
                      <strong>{s.name}</strong>
                      <p>{[s.filters.city, s.filters.type ? TYPE_LABELS[s.filters.type] : null, s.filters.minBeds != null ? `${s.filters.minBeds}+ beds` : null, s.filters.minPrice != null ? `from ${inrShort(s.filters.minPrice)}` : null, s.filters.maxPrice != null ? `up to ${inrShort(s.filters.maxPrice)}` : null].filter(Boolean).join(' · ') || 'No filters — any new listing matches'}</p>
                    </div>
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => deleteSavedSearch(s.id)}>Delete</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {view.name === 'favourites' ? (
          <div className="page">
            <div className="page-head">
              <p className="label">(01) — FAVOURITES</p>
              <h1>Homes you <em>kept.</em></h1>
              <button type="button" className="btn btn-ghost" onClick={() => setView({ name: 'browse' })}>← Back to browse</button>
            </div>
            {status ? <p className="form-status" role="status">{status}</p> : null}
            {!view.list || view.list.length === 0 ? (
              <p className="empty-state">Nothing saved yet. Tap “Save” on any listing to keep it here.</p>
            ) : (
              <ul className="prop-rows">
                {view.list.map((p, i) => (
                  <li key={p.id} className="prop-row">
                    <button type="button" className="prop-row-main" onClick={() => setDetail(p)}>
                      <span className="prop-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                      <span className="prop-art-wrap"><PropertyArt type={p.type} label={p.title} /></span>
                      <span className="prop-row-text">
                        <span className="prop-row-title">{p.title}{p.demo ? <span className="tag tag-sample">Sample</span> : null}</span>
                        <span className="prop-row-meta">{TYPE_LABELS[p.type]} · {p.locality}, {p.city} · {p.beds} bed · {p.areaSqft.toLocaleString('en-IN')} sq ft</span>
                      </span>
                      <span className="prop-row-side"><span className="prop-price">{inr(p.price)}</span><span className="prop-ppsf">{inr(p.pricePerSqft)} / sq ft</span></span>
                    </button>
                    <span className="prop-row-actions">
                      <button type="button" className="btn btn-ghost btn-small" onClick={() => toggleFavourite(p.id)}>Remove</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {view.name === 'agent' ? (
          <div className="page">
            <div className="page-head">
              <p className="label">(01) — AGENT DASHBOARD</p>
              <h1>Your listings, <em>your enquiries.</em></h1>
              <p className="lede">You have {myListings.length} listing{myListings.length === 1 ? '' : 's'} on the board.</p>
              <button type="button" className="btn btn-primary" onClick={() => setShowForm({ mode: 'new' })}>+ List a property</button>
            </div>
            {status ? <p className="form-status" role="status">{status}</p> : null}
            {myListings.length === 0 ? (
              <p className="empty-state">No listings yet — list your first property to see it here.</p>
            ) : (
              <ul className="prop-rows">
                {myListings.map((p, i) => (
                  <li key={p.id} className="prop-row">
                    <button type="button" className="prop-row-main" onClick={() => setDetail(p)}>
                      <span className="prop-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                      <span className="prop-art-wrap"><PropertyArt type={p.type} label={p.title} /></span>
                      <span className="prop-row-text">
                        <span className="prop-row-title">{p.title}<span className={`status-pill status-${p.status}`}>{STATUS_LABELS[p.status]}</span></span>
                        <span className="prop-row-meta">{TYPE_LABELS[p.type]} · {p.locality}, {p.city} · {p.beds} bed · {p.areaSqft.toLocaleString('en-IN')} sq ft</span>
                      </span>
                      <span className="prop-row-side"><span className="prop-price">{inr(p.price)}</span></span>
                    </button>
                    <span className="prop-row-actions">
                      <button type="button" className="btn btn-ghost btn-small" onClick={() => setShowForm({ mode: 'edit', property: p })}>Edit</button>
                      <button type="button" className="btn btn-ghost btn-small" onClick={() => deleteProperty(p.id)}>Delete</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <section data-reveal>
              <div className="section-head"><h2><span className="section-num">(02)</span> Enquiries on your listings</h2></div>
              {enquiries.length === 0 ? (
                <p className="empty-state">No enquiries yet.</p>
              ) : (
                <ul className="enquiry-list">
                  {enquiries.map((e) => (
                    <EnquiryCard key={e.id} enquiry={e} canReply onReply={replyToEnquiry} />
                  ))}
                </ul>
              )}
            </section>
            {user.role === 'buyer' ? null : (
              <section data-reveal>
                <div className="section-head"><h2><span className="section-num">(03)</span> My enquiries</h2></div>
                <p className="fine-print">Enquiries you sent as a buyer appear under Favourites → open a home and send one. Replies arrive as live alerts.</p>
              </section>
            )}
          </div>
        ) : null}

        {view.name === 'admin' && adminData ? (
          <div className="page">
            <div className="page-head">
              <p className="label">(01) — ADMIN OVERVIEW</p>
              <h1>The board, <em>at a glance.</em></h1>
              <button type="button" className="btn btn-ghost" onClick={() => setView({ name: 'browse' })}>← Back to browse</button>
            </div>
            <ul className="stat-strip">
              <li><strong>{adminData.totalProperties}</strong><span>Properties</span></li>
              <li><strong>{adminData.totalUsers}</strong><span>Users</span></li>
              <li><strong>{adminData.totalEnquiries}</strong><span>Enquiries</span></li>
            </ul>
            <section className="analytics-split" data-reveal>
              <div>
                <div className="section-head"><h2><span className="section-num">(02)</span> Listings by status</h2></div>
                <ul className="stat-list">
                  {adminData.listingsByStatus.map((r) => (
                    <li key={r.status}><span>{STATUS_LABELS[r.status]}</span><strong>{r.count}</strong></li>
                  ))}
                </ul>
              </div>
              <div className="analytics-dark">
                <p className="label label-light">(03) — BY CITY</p>
                <ul className="stat-list stat-list-dark">
                  {adminData.listingsByCity.map((r) => (
                    <li key={r.city}><span>{r.city}</span><strong>{r.count}</strong></li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        ) : null}

        {view.name === 'browse' || view.name === 'agent' ? (
          <footer className="site-footer">
            <span>© 2026 Akhand</span>
            <span>NestHunt — a demo listing platform. No real properties, prices or payments.</span>
          </footer>
        ) : null}
      </main>

      {compareIds.length > 0 && view.name === 'browse' ? (
        <div className="compare-tray" role="region" aria-label="Compare tray">
          <span><strong>{compareIds.length}</strong> home{compareIds.length === 1 ? '' : 's'} selected to compare</span>
          <span className="tray-names">{compareIds.map((id) => properties.find((p) => p.id === id)?.title).filter(Boolean).join(' · ')}</span>
          <button type="button" className="btn btn-primary btn-small" onClick={openCompare} disabled={compareIds.length < 2}>
            Compare {compareIds.length < 2 ? '(pick 2–3)' : 'now'}
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setCompareIds([])}>Clear</button>
        </div>
      ) : null}

      {detail ? (
        <Dialog title={detail.title} onClose={() => setDetail(null)}>
          <PropertyDetail property={detail} user={user} onEnquired={() => { loadEnquiries(); }} onClose={() => setDetail(null)} />
        </Dialog>
      ) : null}

      {showForm ? (
        <Dialog title={showForm.mode === 'edit' ? 'Edit listing' : 'List a property'} onClose={() => setShowForm(null)}>
          <PropertyForm
            initial={showForm.mode === 'edit' ? showForm.property : null}
            onClose={() => setShowForm(null)}
            onSaved={() => {
              setShowForm(null);
              loadProperties();
              setStatus(showForm.mode === 'edit' ? 'Listing updated.' : 'Listing published — matching saved searches have been alerted.');
            }}
          />
        </Dialog>
      ) : null}
    </div>
  );
}

function EnquiryCard({ enquiry, canReply, onReply }) {
  const [reply, setReply] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <li className="enquiry-card">
      <p><strong>{enquiry.property?.title || 'Listing'}</strong> — from {enquiry.from?.name || 'a buyer'}</p>
      <p className="enquiry-msg">“{enquiry.message}”</p>
      {enquiry.reply ? (
        <p className="enquiry-reply" role="status">Your reply: “{enquiry.reply}”</p>
      ) : canReply ? (
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reply.trim()) return;
            onReply(enquiry.id, reply.trim());
            setSent(true);
          }}
        >
          <label className="field">
            <span>Reply to this enquiry</span>
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="e.g. Yes — a viewing is possible this weekend." />
          </label>
          <button type="submit" className="btn btn-primary btn-small" disabled={sent}>{sent ? 'Sent' : 'Send reply'}</button>
        </form>
      ) : null}
    </li>
  );
}

function PropertyDetail({ property, user, onEnquired, onClose }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function sendEnquiry(e) {
    e.preventDefault();
    setError('');
    if (!message.trim()) { setError('Write a short message first.'); return; }
    setBusy(true);
    try {
      await api.enquire(property.id, { message: message.trim() });
      setSent(true);
      onEnquired();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="detail-body">
      <PropertyArt type={property.type} label={property.title} />
      <p className="detail-meta">
        {TYPE_LABELS[property.type]} · {property.locality}, {property.city} · <span className={`status-pill status-${property.status}`}>{STATUS_LABELS[property.status]}</span>
      </p>
      <p className="detail-price">{inr(property.price)} <span>· {inr(property.pricePerSqft)} / sq ft</span></p>
      <p className="detail-specs">
        {property.beds} bed · {property.baths} bath · {property.areaSqft.toLocaleString('en-IN')} sq ft
      </p>
      <p>{property.description || 'No description supplied for this listing.'}</p>
      <p className="fine-print">Amenities: {(property.amenities || []).join(', ') || 'none listed'} · Listed by {property.agent?.name || '—'}{property.demo ? ' · Sample listing for demonstration' : ''}</p>
      <p className="fine-print">Illustrative preview — the drawing above is not a photo of this property.</p>
      <EmiCalculator initialPrice={property.price} />
      <form onSubmit={sendEnquiry} className="enquiry-form" noValidate>
        <label className="field">
          <span>Ask the agent about this home *</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows="3" placeholder="e.g. Is a viewing possible this weekend? Is the price negotiable?" />
        </label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {sent ? (
          <p className="form-status" role="status">Enquiry sent — the agent has been alerted and will reply here.</p>
        ) : (
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send enquiry'}</button>
        )}
      </form>
      <div className="dialog-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
