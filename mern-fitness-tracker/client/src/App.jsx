import { useCallback, useEffect, useState } from 'react';
import { api, getStoredUser, setToken, setStoredUser } from './api.js';
import { disconnectSocket } from './socket.js';
import Cursor from './components/Cursor.jsx';
import Home from './pages/Home.jsx';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Exercises from './pages/Exercises.jsx';
import Templates from './pages/Templates.jsx';
import Session from './pages/Session.jsx';
import History from './pages/History.jsx';
import Records from './pages/Records.jsx';
import Analytics from './pages/Analytics.jsx';
import Challenges from './pages/Challenges.jsx';
import Plans from './pages/Plans.jsx';
import Admin from './pages/Admin.jsx';
import { config } from './data/config.js';

const PUBLIC_PAGES = ['home', 'auth', 'exercises', 'challenges'];
const MEMBER_PAGES = [
  'dashboard',
  'templates',
  'session',
  'history',
  'records',
  'analytics',
  'plans',
];

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [page, param] = raw.split('/');
  return { page: page || 'home', param: param || null };
}

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [route, setRoute] = useState(() => parseHash());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!user) return;
    api
      .me()
      .then((data) => {
        setUser(data.user);
        setStoredUser(data.user);
      })
      .catch(() => {
        setUser(null);
        setStoredUser(null);
        setToken(null);
        disconnectSocket();
      });
  }, []);

  const go = useCallback((page, param) => {
    const apply = () => {
      window.location.hash = param ? `#/${page}/${param}` : `#/${page}`;
      setMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    // Cross-zoom route transition (E4) via the View Transitions API, with
    // a plain hash change as the fallback.
    if (document.startViewTransition) document.startViewTransition(apply);
    else apply();
  }, []);

  function signOut() {
    setToken(null);
    setStoredUser(null);
    disconnectSocket();
    setUser(null);
    go('home');
  }

  const { page, param } = route;
  const isAuthed = Boolean(user);
  const needsAuth = !PUBLIC_PAGES.includes(page) && !isAuthed;
  const activePage = needsAuth ? 'auth' : page;

  const navLinks = [
    { id: 'home', label: 'Home', show: true },
    { id: 'dashboard', label: 'Dashboard', show: isAuthed },
    { id: 'exercises', label: 'Exercises', show: true },
    { id: 'templates', label: 'Templates', show: isAuthed },
    { id: 'history', label: 'History', show: isAuthed },
    { id: 'records', label: 'Records', show: isAuthed },
    { id: 'analytics', label: 'Analytics', show: isAuthed },
    { id: 'challenges', label: 'Challenges', show: true },
    { id: 'plans', label: 'Plans', show: isAuthed },
    { id: 'admin', label: 'Admin', show: isAuthed && user?.role === 'admin' },
  ];

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Cursor />
      <header className="nav">
        <button type="button" className="nav-logo" onClick={() => go('home')} aria-label="PulseFit home">
          Pulse<span>Fit</span>
        </button>
        <nav className={`nav-links ${menuOpen ? 'nav-links--open' : ''}`} aria-label="Main navigation">
          {navLinks
            .filter((l) => l.show)
            .map((l) => (
              <button
                key={l.id}
                type="button"
                className={activePage === l.id ? 'nav-link nav-link--active' : 'nav-link'}
                onClick={() => go(l.id)}
                aria-current={activePage === l.id ? 'page' : undefined}
              >
                {l.label}
              </button>
            ))}
        </nav>
        <div className="nav-actions">
          {isAuthed ? (
            <>
              <span className="nav-user">{user.name}</span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => go('auth')}>
              Sign in
            </button>
          )}
          <button
            type="button"
            className="nav-menu-btn"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      <main id="main">
        <div key={activePage} className="page-zoom">
        {activePage === 'home' && <Home user={user} go={go} />}
        {activePage === 'auth' && (
          <Auth
            onAuth={(u) => {
              setUser(u);
              go('dashboard');
            }}
          />
        )}
        {activePage === 'dashboard' && isAuthed && <Dashboard user={user} go={go} />}
        {activePage === 'exercises' && <Exercises user={user} />}
        {activePage === 'templates' && isAuthed && <Templates user={user} go={go} />}
        {activePage === 'session' && isAuthed && <Session sessionId={param} go={go} />}
        {activePage === 'history' && isAuthed && <History go={go} />}
        {activePage === 'records' && isAuthed && <Records go={go} />}
        {activePage === 'analytics' && isAuthed && <Analytics />}
        {activePage === 'challenges' && <Challenges user={user} />}
        {activePage === 'plans' && isAuthed && <Plans user={user} go={go} />}
        {activePage === 'admin' && isAuthed && user.role === 'admin' && <Admin />}
        {activePage === 'admin' && isAuthed && user.role !== 'admin' && (
          <p className="page-error" role="alert">
            Admins only.
          </p>
        )}
        {!MEMBER_PAGES.includes(activePage) &&
          !PUBLIC_PAGES.includes(activePage) &&
          activePage !== 'admin' && (
            <section className="section">
              <h1 className="section-title">Page not found.</h1>
              <button type="button" className="btn btn--primary" onClick={() => go('home')}>
                Back home
              </button>
            </section>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <p className="footer-brand">
            Pulse<span>Fit</span> — {config.tagline}
          </p>
          <nav className="footer-nav" aria-label="Footer navigation">
            <button type="button" onClick={() => go('exercises')}>
              Exercises
            </button>
            <button type="button" onClick={() => go('templates')}>
              Templates
            </button>
            <button type="button" onClick={() => go('challenges')}>
              Challenges
            </button>
            <button type="button" onClick={() => go('records')}>
              Records
            </button>
          </nav>
          <p className="footer-copy">© {new Date().getFullYear()} Akhand</p>
          <button type="button" className="footer-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Back to top ↑
          </button>
        </div>
      </footer>
    </div>
  );
}
