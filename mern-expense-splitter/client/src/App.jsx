import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { getStoredUser, setStoredUser, setToken, userIdOf } from './api';
import { disconnectSocket, getSocket } from './socket';
import Cursor from './components/Cursor';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
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
    navigate('/');
  }

  return (
    <div className="app">
      <Cursor />
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="nav">
        <ScrollProgress />
        <Link className="nav-logo" to="/">
          Fair<span className="nav-logo-accent">Share</span>
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/" end>Home</NavLink>
          {user && <NavLink to="/dashboard">Dashboard</NavLink>}
          {user && <NavLink to="/groups">Groups</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
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
          <Route path="/dashboard" element={<Dashboard user={user} />} />
          <Route path="/groups" element={<Groups user={user} />} />
          <Route path="/groups/:id" element={<GroupDetail user={user} />} />
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
            <p className="footer-logo">FairShare</p>
            <p className="muted small">
              Split group expenses fairly — log it once, split it your way, and settle
              in the fewest transfers.
            </p>
          </div>
          <nav className="footer-nav" aria-label="Footer navigation">
            <Link to="/">Home</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/groups">Groups</Link>
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
  );
}
