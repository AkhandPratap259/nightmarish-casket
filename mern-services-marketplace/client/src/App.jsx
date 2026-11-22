import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { getStoredUser, setStoredUser, setToken } from './api';
import { disconnectSocket, getSocket } from './socket';
import Cursor from './components/Cursor';
import Home from './pages/Home';
import Browse from './pages/Browse';
import OfferingDetail from './pages/OfferingDetail';
import MyBookings from './pages/MyBookings';
import ProviderDashboard from './pages/ProviderDashboard';
import OfferingForm from './pages/OfferingForm';
import ProviderProfile from './pages/ProviderProfile';
import Auth from './pages/Auth';
import Admin from './pages/Admin';

const RAIL_KEY = 'tasktrove_rail_w';
const RAIL_MIN = 208;
const RAIL_MAX = 360;
const RAIL_DEFAULT = 272;

function initialRailWidth() {
  try {
    const saved = Number(localStorage.getItem(RAIL_KEY));
    if (saved >= RAIL_MIN && saved <= RAIL_MAX) return saved;
  } catch {
    /* storage unavailable — fall through to the default */
  }
  return RAIL_DEFAULT;
}

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [railW, setRailW] = useState(initialRailWidth);
  const dragRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) getSocket(user.id);
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
  }

  // Resizable sidebar pane: drag the handle, or focus it and use ← →.
  function onResizerPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: railW, latest: railW };
    const onMove = (ev) => {
      if (!dragRef.current) return;
      const next = dragRef.current.startW + (ev.clientX - dragRef.current.startX);
      const clamped = Math.min(RAIL_MAX, Math.max(RAIL_MIN, Math.round(next)));
      dragRef.current.latest = clamped;
      setRailW(clamped);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (dragRef.current) {
        try {
          localStorage.setItem(RAIL_KEY, String(dragRef.current.latest));
        } catch {
          /* storage unavailable — width still applies for this session */
        }
      }
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function onResizerKeyDown(e) {
    let next = null;
    if (e.key === 'ArrowLeft') next = railW - 16;
    else if (e.key === 'ArrowRight') next = railW + 16;
    else if (e.key === 'Home') next = RAIL_MIN;
    else if (e.key === 'End') next = RAIL_MAX;
    if (next === null) return;
    e.preventDefault();
    const clamped = Math.min(RAIL_MAX, Math.max(RAIL_MIN, next));
    setRailW(clamped);
    try {
      localStorage.setItem(RAIL_KEY, String(clamped));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="app" style={{ '--rail-w': `${railW}px` }}>
      <Cursor />
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <aside className="rail" aria-label="Workspace sidebar">
        <Link className="rail-brand" to="/">
          <span className="seal" aria-hidden="true">TT</span>
          <span>
            <span className="rail-brand-name">
              Task<em>Trove</em>
            </span>
            <span className="rail-brand-sub">Local services · Pinboard</span>
          </span>
        </Link>
        <p className="rail-vertical" aria-hidden="true">
          Trusted locals — ranked by a score you can see
        </p>
        <nav className="rail-nav" aria-label="Main navigation">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/browse">Browse services</NavLink>
          {user && <NavLink to="/bookings">My bookings</NavLink>}
          {user?.role === 'provider' && <NavLink to="/provider">Provider dashboard</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="rail-auth">
          {user ? (
            <>
              <span className="rail-user">
                Signed in as <strong>{user.name}</strong> · {user.role}
              </span>
              <button type="button" className="btn btn-ghost btn-small" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost btn-small" to="/login">Sign in</Link>
              <Link className="btn btn-primary btn-small" to="/register">Join free</Link>
            </>
          )}
        </div>
      </aside>

      <div
        className="rail-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar — drag, or use left and right arrow keys"
        aria-valuenow={railW}
        aria-valuemin={RAIL_MIN}
        aria-valuemax={RAIL_MAX}
        tabIndex={0}
        onPointerDown={onResizerPointerDown}
        onKeyDown={onResizerKeyDown}
      />

      <div className="workspace-main">
        <div id="main-content">
          {/* E7 blur dissolve on every route change, snappy spring. */}
          <div key={location.pathname} className="route-view">
            <Routes>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/browse" element={<Browse user={user} />} />
              <Route path="/offerings/:id" element={<OfferingDetail user={user} />} />
              <Route path="/providers/:id" element={<ProviderProfile />} />
              <Route path="/bookings" element={<MyBookings user={user} />} />
              <Route path="/provider" element={<ProviderDashboard user={user} />} />
              <Route path="/provider/offerings/new" element={<OfferingForm user={user} />} />
              <Route path="/provider/offerings/:id/edit" element={<OfferingForm user={user} />} />
              <Route path="/login" element={<Auth mode="login" onAuth={handleAuth} />} />
              <Route path="/register" element={<Auth mode="register" onAuth={handleAuth} />} />
              <Route path="/admin" element={<Admin user={user} />} />
              <Route
                path="*"
                element={
                  <main className="page">
                    <h1 className="page-title">Page not <em>found</em></h1>
                    <p><Link to="/">Back to the home page</Link></p>
                  </main>
                }
              />
            </Routes>
          </div>
        </div>

        <footer className="footer">
          <div className="footer-inner">
            <div>
              <p className="footer-logo">Task<em>Trove</em></p>
              <p className="muted small">
                A local services marketplace. Book trusted providers in your area, track the job,
                and review the work.
              </p>
              <span className="seal footer-seal" aria-hidden="true">TT</span>
            </div>
            <nav className="footer-nav" aria-label="Footer navigation">
              <Link to="/">Home</Link>
              <Link to="/browse">Browse services</Link>
              <Link to="/bookings">My bookings</Link>
              <Link to="/login">Sign in</Link>
            </nav>
            <div className="footer-meta">
              <p className="muted small">Demo data is illustrative. No payment is taken.</p>
              <p>© 2026 Akhand</p>
              <a href="#main-content">Back to top ↑</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
