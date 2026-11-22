import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { getStoredUser, setStoredUser, setToken, userIdOf } from './api';
import { disconnectSocket, getSocket } from './socket';
import ParticleField from './components/ParticleField';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Browse from './pages/Browse';
import RecipeDetail from './pages/RecipeDetail';
import MyRecipes from './pages/MyRecipes';
import Planner from './pages/Planner';
import Grocery from './pages/Grocery';
import Collections from './pages/Collections';
import Admin from './pages/Admin';

function ScrollProgress() {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setWidth(max > 0 ? (doc.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="scroll-progress" aria-hidden="true">
      <div className="scroll-progress-fill" style={{ width: `${width}%` }} />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) getSocket(userIdOf(user));
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
    setMenuOpen(false);
    navigate('/');
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="app">
      <ParticleField />
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="nav">
        <ScrollProgress />
        <Link className="nav-logo" to="/" onClick={closeMenu}>
          <span className="nav-logo-mark" aria-hidden="true">❦</span>
          Flavor<span className="nav-logo-accent">Forge</span>
        </Link>
        <button
          type="button"
          className="nav-menu-btn"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <nav className={`nav-links ${menuOpen ? 'nav-links--open' : ''}`} aria-label="Main navigation">
          <NavLink to="/" end onClick={closeMenu}>Home</NavLink>
          <NavLink to="/browse" onClick={closeMenu}>Browse</NavLink>
          {user && <NavLink to="/my-recipes" onClick={closeMenu}>My Recipes</NavLink>}
          {user && <NavLink to="/planner" onClick={closeMenu}>Planner</NavLink>}
          {user && <NavLink to="/grocery" onClick={closeMenu}>Grocery List</NavLink>}
          {user && <NavLink to="/collections" onClick={closeMenu}>Collections</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin" onClick={closeMenu}>Admin</NavLink>}
        </nav>
        <div className="nav-auth">
          {user ? (
            <>
              <span className="nav-user">{user.name}</span>
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
      </header>

      <div id="main-content">
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/login" element={<Auth mode="login" onAuth={handleAuth} />} />
          <Route path="/register" element={<Auth mode="register" onAuth={handleAuth} />} />
          <Route path="/browse" element={<Browse user={user} />} />
          <Route path="/recipes/:id" element={<RecipeDetail user={user} />} />
          <Route path="/my-recipes" element={<MyRecipes user={user} />} />
          <Route path="/planner" element={<Planner user={user} />} />
          <Route path="/grocery" element={<Grocery user={user} />} />
          <Route path="/collections" element={<Collections user={user} />} />
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

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <p className="footer-logo">FlavorForge</p>
            <p className="muted small">
              Recipes, scaled to your table, planned for your week, and turned
              into one grocery list.
            </p>
          </div>
          <nav className="footer-nav" aria-label="Footer navigation">
            <Link to="/">Home</Link>
            <Link to="/browse">Browse</Link>
            <Link to="/planner">Planner</Link>
            <Link to="/login">Sign in</Link>
          </nav>
          <div className="footer-meta">
            <p className="muted small">Seed recipes are demo data. Nutrition figures are estimates, not measurements.</p>
            <p>© 2026 Akhand</p>
            <a href="#main-content">Back to top ↑</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
