import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api, getStoredUser, setStoredUser, setToken } from './api';
import { disconnectSocket } from './socket';
import CommandPalette from './components/CommandPalette';
import Home from './pages/Home';
import Leagues from './pages/Leagues';
import LeagueDetail from './pages/LeagueDetail';
import MatchDetail from './pages/MatchDetail';
import CreateLeague from './pages/CreateLeague';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

function SplitPanels({ runId }) {
  if (!runId) return null;
  return (
    <div className="split-panels" aria-hidden="true" key={runId}>
      <span className="split-panels__panel split-panels__panel--a" />
      <span className="split-panels__panel split-panels__panel--b" />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [splitRun, setSplitRun] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!getStoredUser()) return;
    api.me().then((d) => setUser(d.user)).catch(() => {
      setToken(null);
      setStoredUser(null);
      setUser(null);
    });
  }, []);

  // Split-panel route transition (E6): two diagonal panels sweep across
  // on every route change, in the mechanical stepped motion personality.
  useEffect(() => {
    setSplitRun((n) => n + 1);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleAuth = useCallback((nextUser) => setUser(nextUser), []);

  function signOut() {
    setToken(null);
    setStoredUser(null);
    disconnectSocket();
    setUser(null);
    navigate('/');
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to main content</a>
      <SplitPanels runId={splitRun} />
      <header className="nav">
        <Link className="nav__brand" to="/" aria-label="PlayPulse home">
          <span className="nav__ball" aria-hidden="true">●</span>
          <span className="nav__word">PLAY<span>PULSE</span></span>
        </Link>
        <button
          type="button"
          className="nav__toggle"
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? 'Close menu' : 'Menu'}
        </button>
        <nav id="main-nav" className={`nav__links${menuOpen ? ' nav__links--open' : ''}`} aria-label="Main">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/leagues">Leagues</NavLink>
          {user && <NavLink to="/dashboard">Dashboard</NavLink>}
          {user && user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          {user ? (
            <>
              <span className="nav__user">Hi, {user.name.split(' ')[0]}</span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <NavLink to="/auth" className="nav__signin">Sign in</NavLink>
          )}
          <button type="button" className="btn btn--secondary btn--sm nav__palette" onClick={() => setPaletteOpen(true)} aria-label="Open command palette (Control K)">
            ⌘K <span className="nav__palette-label">Commands</span>
          </button>
        </nav>
      </header>

      <main id="main">
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/leagues" element={<Leagues />} />
          <Route path="/leagues/new" element={<CreateLeague user={user} />} />
          <Route path="/leagues/:id" element={<LeagueDetail user={user} />} />
          <Route path="/matches/:id" element={<MatchDetail user={user} />} />
          <Route path="/dashboard" element={<Dashboard user={user} />} />
          <Route path="/auth" element={<Auth onAuth={handleAuth} />} />
          <Route path="/admin" element={<Admin user={user} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          <p><strong>PLAYPULSE</strong> — community leagues, run properly.</p>
          <p className="footer__links">
            <Link to="/leagues">Leagues</Link>
            <Link to="/leagues/new">Start a league</Link>
            <Link to="/dashboard">Dashboard</Link>
          </p>
          <p>© 2026 Akhand · Demo data is for local testing only.</p>
        </div>
      </footer>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} user={user} />
    </div>
  );
}
