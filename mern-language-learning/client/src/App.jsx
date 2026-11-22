import { useCallback, useEffect, useRef, useState } from 'react';
import { api, setToken, setStoredUser, getStoredUser } from './api';
import { config } from './data/config';
import { getSocket, disconnectSocket } from './socket';
import Cursor from './components/Cursor';
import Dialog from './components/Dialog';
import Starfield from './components/Starfield';
import Home from './pages/Home';
import Learn from './pages/Learn';
import Lesson from './pages/Lesson';
import Review from './pages/Review';
import Leaderboard from './pages/Leaderboard';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import Instructor from './pages/Instructor';
import Admin from './pages/Admin';

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [view, setView] = useState({ name: 'home' });
  const [toasts, setToasts] = useState([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [boardTick, setBoardTick] = useState(0);
  const [flashKey, setFlashKey] = useState(0);
  const toastId = useRef(0);

  const notify = useCallback((message, kind = 'info') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  const go = useCallback((next) => {
    setView(next);
    setMenuOpen(false);
    setFlashKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Validate the stored session on load; drop it if the server rejects it.
  useEffect(() => {
    if (!getStoredUser()) return;
    api
      .me()
      .then(({ user: fresh }) => {
        setUser(fresh);
        setStoredUser(fresh);
      })
      .catch(() => {
        setToken(null);
        setStoredUser(null);
        setUser(null);
      });
  }, []);

  // Live socket: leaderboard updates and lesson-completion celebrations.
  // Each event is emitted once by the server and handled once here.
  useEffect(() => {
    const socket = getSocket(user?.id);
    const onBoard = () => setBoardTick((t) => t + 1);
    const onCompleted = (payload) => {
      notify(
        `Lesson complete: “${payload.title}” — +${payload.xp} XP${payload.leveledUp ? ` · level ${payload.level}!` : ''}${
          payload.achievements && payload.achievements.length
            ? ` · badge: ${payload.achievements.join(', ')}`
            : ''
        }`,
        'success'
      );
    };
    socket.on('leaderboard:update', onBoard);
    socket.on('lesson:completed', onCompleted);
    return () => {
      socket.off('leaderboard:update', onBoard);
      socket.off('lesson:completed', onCompleted);
    };
  }, [user, notify]);

  function handleAuth(nextUser) {
    setUser(nextUser);
    setStoredUser(nextUser);
    setAuthOpen(false);
    notify(`Signed in as ${nextUser.name}`, 'success');
    go({ name: 'dashboard' });
  }

  // Refresh the signed-in user after XP, streak or level changes.
  function handleUserUpdate(freshUser) {
    if (!freshUser) return;
    setUser(freshUser);
    setStoredUser(freshUser);
  }

  function signOut() {
    setToken(null);
    setStoredUser(null);
    setUser(null);
    disconnectSocket();
    notify('Signed out', 'info');
    go({ name: 'home' });
  }

  function requireAuth() {
    setAuthOpen(true);
  }

  const navLinks = [
    { label: 'Home', view: { name: 'home' } },
    { label: 'Learn', view: { name: 'learn', language: 'es' } },
    { label: 'Review', view: { name: 'review' } },
    { label: 'Leaderboard', view: { name: 'leaderboard' } },
    { label: 'Dashboard', view: { name: 'dashboard' } },
  ];
  if (user?.role === 'instructor' || user?.role === 'admin') {
    navLinks.push({ label: 'Instructor', view: { name: 'instructor' } });
  }
  if (user?.role === 'admin') navLinks.push({ label: 'Admin', view: { name: 'admin' } });

  const viewKey = `${view.name}-${view.language || ''}-${view.id || ''}`;

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to main content</a>
      <Starfield />
      <Cursor />
      {flashKey > 0 ? (
        <div key={flashKey} className="glitch-flash" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      ) : null}
      <header className="topbar">
        <div className="nav-inner">
          <button type="button" className="logo" onClick={() => go({ name: 'home' })} aria-label="LinguaLeap — home">
            <svg className="logo-mark" width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
              <defs>
                <linearGradient id="logoSun" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ffe95e" />
                  <stop offset="0.55" stopColor="#ff7a18" />
                  <stop offset="1" stopColor="#ff2e88" />
                </linearGradient>
                <clipPath id="logoSunClip"><circle cx="17" cy="17" r="15" /></clipPath>
              </defs>
              <circle cx="17" cy="17" r="15" fill="url(#logoSun)" />
              <g fill="#0a0e27" clipPath="url(#logoSunClip)">
                <rect x="2" y="19" width="30" height="2" />
                <rect x="2" y="23" width="30" height="3" />
                <rect x="2" y="28" width="30" height="4" />
              </g>
            </svg>
            LinguaLeap
          </button>
          <nav className="nav-links" aria-label="Main navigation">
            {navLinks.map((l) => (
              <button
                key={l.label}
                type="button"
                className={view.name === l.view.name ? 'is-active' : ''}
                onClick={() => go(l.view)}
                aria-current={view.name === l.view.name ? 'page' : undefined}
              >
                {l.label}
              </button>
            ))}
          </nav>
          <div className="nav-auth">
            {user ? (
              <>
                <span className="nav-user">
                  {user.streak}-day streak · {user.xp} XP
                </span>
                <button type="button" className="btn btn-ghost btn-small" onClick={signOut}>
                  Sign out
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary btn-small" onClick={() => setAuthOpen(true)}>
                Sign in
              </button>
            )}
            <button
              type="button"
              className="menu-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <nav className="nav-panel" id="mobile-nav" aria-label="Mobile navigation">
            {navLinks.map((l) => (
              <button key={l.label} type="button" onClick={() => go(l.view)}>
                {l.label}
              </button>
            ))}
            {user ? (
              <button type="button" onClick={signOut}>Sign out ({user.name})</button>
            ) : (
              <button type="button" onClick={() => { setMenuOpen(false); setAuthOpen(true); }}>Sign in</button>
            )}
          </nav>
        ) : null}
      </header>

      <main id="main">
        <div key={viewKey} className="glitch-in">
          {view.name === 'home' ? (
            <Home user={user} onGo={go} onRequireAuth={requireAuth} />
          ) : view.name === 'learn' ? (
            <Learn
              language={view.language || 'es'}
              onLanguage={(code) => go({ name: 'learn', language: code })}
              onStartLesson={(id) => go({ name: 'lesson', id, language: view.language || 'es' })}
              onRequireAuth={requireAuth}
              notify={notify}
            />
          ) : view.name === 'lesson' ? (
            <Lesson
              lessonId={view.id}
              onExit={() => go({ name: 'learn', language: view.language || 'es' })}
              onFinished={handleUserUpdate}
              notify={notify}
            />
          ) : view.name === 'review' ? (
            <Review onFinished={handleUserUpdate} notify={notify} />
          ) : view.name === 'leaderboard' ? (
            <Leaderboard user={user} boardTick={boardTick} />
          ) : view.name === 'dashboard' ? (
            <Dashboard user={user} onGo={go} onRequireAuth={requireAuth} />
          ) : view.name === 'instructor' ? (
            <Instructor user={user} notify={notify} />
          ) : view.name === 'admin' ? (
            <Admin user={user} />
          ) : null}
        </div>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <p className="footer-brand">LinguaLeap — learn a language, one small win at a time.</p>
          <p className="footer-note">
            A demo learning platform. Sample beginner lessons only — no real courses are sold and no payment is collected.
            Listening uses your browser’s built-in speech synthesis.
          </p>
          <nav aria-label="Footer">
            <button type="button" onClick={() => go({ name: 'home' })}>Home</button>
            <button type="button" onClick={() => go({ name: 'learn', language: 'es' })}>Learn</button>
            <button type="button" onClick={() => go({ name: 'review' })}>Review</button>
            <button type="button" onClick={() => go({ name: 'leaderboard' })}>Leaderboard</button>
          </nav>
          <p className="footer-note">
            {config.repoLink ? (
              <a href={config.repoLink}>Source code</a>
            ) : (
              'Source code — link soon'
            )}
            {' · © 2026 Akhand'}
          </p>
          <button type="button" className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Back to top ↑
          </button>
        </div>
      </footer>

      {authOpen ? (
        <Dialog title="Sign in to LinguaLeap" onClose={() => setAuthOpen(false)}>
          <Auth mode="login" onAuth={handleAuth} onGo={go} />
        </Dialog>
      ) : null}

      <div className="toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind === 'error' ? 'is-error' : t.kind === 'success' ? 'is-success' : ''}`} role="status">
            {t.message}
            <button type="button" aria-label="Dismiss notification" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
