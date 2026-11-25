import { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { clearAuth, getUser, isLoggedIn } from './api';
import Cursor from './components/Cursor';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import Materials from './pages/Materials';
import Contractors from './pages/Contractors';
import NotFound from './pages/NotFound';

function Protected({ children }) {
  const navigate = useNavigate();
  useEffect(() => { if (!isLoggedIn()) navigate('/login'); }, [navigate]);
  if (!isLoggedIn()) return null;
  return children;
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const loggedIn = isLoggedIn();

  // Ink-bleed origin: set the wipe centre from the click point where possible.
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.style.setProperty('--bleed-x', '50%');
      root.style.setProperty('--bleed-y', '50%');
    }
  }, [location.pathname]);

  function logout() {
    clearAuth();
    navigate('/');
  }

  return (
    <>
      <Cursor />
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="nav">
        <Link className="nav-logo" to={loggedIn ? '/dashboard' : '/'}>
          <span className="nav-logo-mark" aria-hidden="true">⌂</span> HomeDraft
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          {loggedIn ? (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/materials">Materials</NavLink>
              <NavLink to="/contractors">Contractors</NavLink>
              <span className="nav-user">{user?.name} ({user?.role})</span>
              <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Sign in</NavLink>
              <NavLink to="/register">Create account</NavLink>
            </>
          )}
        </nav>
      </header>
      <main id="main">
        <Routes>
          <Route path="/" element={loggedIn ? <Dashboard /> : <Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/projects/:id" element={<Protected><ProjectDetail /></Protected>} />
          <Route path="/materials" element={<Protected><Materials /></Protected>} />
          <Route path="/contractors" element={<Protected><Contractors /></Protected>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="container">
          <p><strong>HomeDraft</strong> — Measure, plan, budget, build.</p>
          <p>Sample data in the demo account is labelled as such; prices are illustrations, not live quotes. <Link to="/">Back to top</Link></p>
          <p>© 2026 Akhand</p>
        </div>
      </footer>
    </>
  );
}
