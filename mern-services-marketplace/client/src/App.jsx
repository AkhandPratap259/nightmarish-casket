import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
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

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const navigate = useNavigate();

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

  return (
    <div className="app">
      <Cursor />
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="nav">
        <Link className="nav-logo" to="/">
          Task<span className="nav-logo-accent">Trove</span>
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/browse">Browse services</NavLink>
          {user && <NavLink to="/bookings">My bookings</NavLink>}
          {user?.role === 'provider' && <NavLink to="/provider">Provider dashboard</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="nav-auth">
          {user ? (
            <>
              <span className="nav-user">
                {user.name} · {user.role}
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
      </header>

      <div id="main-content">
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

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <p className="footer-logo">TaskTrove</p>
            <p className="muted small">
              A local services marketplace. Book trusted providers in your area, track the job,
              and review the work.
            </p>
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
  );
}
