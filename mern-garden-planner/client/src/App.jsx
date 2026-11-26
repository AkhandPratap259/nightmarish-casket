import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api, getStoredUser, setStoredUser, setToken } from './api';
import { disconnectSocket, getSocket } from './socket';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import GardenDetail from './pages/GardenDetail';
import Plants from './pages/Plants';
import PlantingDetail from './pages/PlantingDetail';
import Tasks from './pages/Tasks';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

// Last pointer position, so the circular reveal (E2) starts from the click.
let lastClick = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => {
    lastClick = { x: e.clientX, y: e.clientY };
  });
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`toast ${toast.kind || ''}`} role="status" aria-live="polite">
      {toast.message}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [toast, setToast] = useState(null);
  const [reveal, setReveal] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const toastTimer = useRef(null);
  const firstRender = useRef(true);

  const showToast = useCallback((message, kind) => {
    setToast({ message, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  // Circular reveal from the click point on every route change (E2).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setReveal({ x: lastClick.x, y: lastClick.y, key: location.pathname + location.search });
    const t = setTimeout(() => setReveal(null), 550);
    return () => clearTimeout(t);
  }, [location.pathname, location.search]);

  useEffect(() => {
    // Restore the session if a token is stored.
    if (!user) return;
    api.me().catch(() => {
      setToken(null);
      setStoredUser(null);
      setUser(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user?.id) getSocket(user.id);
    else disconnectSocket();
  }, [user]);

  function handleAuth(nextUser) {
    setUser(nextUser);
  }

  function signOut() {
    setToken(null);
    setStoredUser(null);
    setUser(null);
    disconnectSocket();
    navigate('/');
    showToast('Signed out — see you at the next watering.', 'success');
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="nav">
        <Link className="nav-brand" to="/" aria-label="SproutPlot home">
          <svg className="mark" viewBox="0 0 64 64" aria-hidden="true">
            <rect width="64" height="64" fill="#fff6e5" stroke="#141414" strokeWidth="3" />
            <circle cx="32" cy="32" r="18" fill="none" stroke="#141414" strokeWidth="3" />
            <circle cx="32" cy="32" r="8" fill="#e30613" stroke="#141414" strokeWidth="2.5" />
            <rect x="27" y="27" width="10" height="10" fill="#f2c200" stroke="#141414" strokeWidth="2" />
          </svg>
          <b>SPROUTPLOT</b>
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/plants">Seed library</NavLink>
          {user && <NavLink to="/dashboard">Dashboard</NavLink>}
          {user && <NavLink to="/tasks">Tasks</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          {user ? (
            <>
              <span className="nav-user" aria-label={`Signed in as ${user.name}`}>{user.name} · {user.role}</span>
              <button type="button" className="linklike" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Sign in</NavLink>
              <NavLink to="/register">Create account</NavLink>
            </>
          )}
        </nav>
      </header>

      {reveal && (
        <div
          key={reveal.key}
          className="reveal-overlay run"
          style={{ '--rx': `${reveal.x}px`, '--ry': `${reveal.y}px` }}
          aria-hidden="true"
        />
      )}

      <main id="main">
        <Routes>
          <Route path="/" element={<Landing user={user} />} />
          <Route path="/login" element={<Auth mode="login" onAuth={handleAuth} />} />
          <Route path="/register" element={<Auth mode="register" onAuth={handleAuth} />} />
          <Route path="/dashboard" element={user ? <Dashboard user={user} toast={showToast} /> : <Auth mode="login" onAuth={handleAuth} />} />
          <Route path="/gardens/:id" element={user ? <GardenDetail user={user} toast={showToast} /> : <Auth mode="login" onAuth={handleAuth} />} />
          <Route path="/plants" element={user ? <Plants user={user} toast={showToast} /> : <Auth mode="login" onAuth={handleAuth} />} />
          <Route path="/plantings/:id" element={user ? <PlantingDetail toast={showToast} /> : <Auth mode="login" onAuth={handleAuth} />} />
          <Route path="/tasks" element={user ? <Tasks user={user} toast={showToast} /> : <Auth mode="login" onAuth={handleAuth} />} />
          <Route path="/admin" element={user?.role === 'admin' ? <Admin toast={showToast} /> : <Auth mode="login" onAuth={handleAuth} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="wrap">
          <span className="foot-mark">SPROUTPLOT</span>
          <span>Grow together, in orbit. A community garden planner.</span>
          <span>© 2026 Akhand</span>
        </div>
      </footer>

      <Toast toast={toast} />
    </>
  );
}
