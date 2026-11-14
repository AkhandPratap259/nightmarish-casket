import { useCallback, useEffect, useRef, useState } from 'react';
import { api, setToken, setStoredUser, getStoredUser } from './api';
import { config } from './data/config';
import { getSocket, disconnectSocket } from './socket';
import Cursor from './components/Cursor';
import Dialog from './components/Dialog';
import Browse from './pages/Browse';
import LotDetail from './pages/LotDetail';
import CreateAuction from './pages/CreateAuction';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Auth from './pages/Auth';

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [view, setView] = useState({ name: 'browse' });
  const [toasts, setToasts] = useState([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toastId = useRef(0);

  const notify = useCallback((message, kind = 'info') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  const go = useCallback((next) => {
    setView(next);
    setMenuOpen(false);
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

  // Live socket: outbid alerts and win notices arrive in the user room.
  useEffect(() => {
    const socket = getSocket(user?.id);
    const onOutbid = (payload) => {
      notify(`Outbid on “${payload.title}” — now at ${payload.amount ? `₹${Number(payload.amount).toLocaleString('en-IN')}` : 'a higher price'}`, 'error');
    };
    const onWon = (payload) => {
      notify(`You won “${payload.title}” at ₹${Number(payload.amount).toLocaleString('en-IN')}`, 'success');
    };
    socket.on('bid:outbid', onOutbid);
    socket.on('auction:won', onWon);
    return () => {
      socket.off('bid:outbid', onOutbid);
      socket.off('auction:won', onWon);
    };
  }, [user, notify]);

  function handleAuth(nextUser) {
    setUser(nextUser);
    setAuthOpen(false);
    notify(`Signed in as ${nextUser.name}`, 'success');
    go({ name: 'browse' });
  }

  function signOut() {
    setToken(null);
    setStoredUser(null);
    setUser(null);
    disconnectSocket();
    notify('Signed out', 'info');
    go({ name: 'browse' });
  }

  function requireAuth() {
    setAuthOpen(true);
  }

  const navLinks = [
    { label: 'Lots', view: { name: 'browse' } },
    { label: 'List a lot', view: { name: 'create' } },
    { label: 'Dashboard', view: { name: 'dashboard' } },
  ];
  if (user?.role === 'admin') navLinks.push({ label: 'Admin', view: { name: 'admin' } });

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to main content</a>
      <Cursor />
      <header className="topbar">
        <div className="nav-inner">
          <button type="button" className="logo" onClick={() => go({ name: 'browse' })} aria-label="BidSphere — home">
            <span className="logo-mark" aria-hidden="true">B</span> BidSphere
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
                <span className="nav-user">Hi, {user.name.split(' ')[0]}</span>
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
        {view.name === 'browse' ? (
          <Browse user={user} onOpenLot={(id) => go({ name: 'lot', id })} onGo={go} onRequireAuth={requireAuth} notify={notify} />
        ) : view.name === 'lot' ? (
          <LotDetail id={view.id} user={user} onBack={() => go({ name: 'browse' })} onRequireAuth={requireAuth} notify={notify} />
        ) : view.name === 'create' ? (
          <CreateAuction user={user} onCreated={(id) => go({ name: 'lot', id })} onGo={go} notify={notify} />
        ) : view.name === 'dashboard' ? (
          <Dashboard user={user} onOpenLot={(id) => go({ name: 'lot', id })} onGo={go} notify={notify} />
        ) : view.name === 'admin' ? (
          <Admin user={user} onGo={go} />
        ) : view.name === 'auth' ? (
          <Auth mode={view.mode} onAuth={handleAuth} onGo={go} />
        ) : null}
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <p className="footer-brand">BidSphere — bid live, win loud.</p>
          <p className="footer-note">
            A demo auction platform. Sample lots only — no real items are sold and no payment is collected.
          </p>
          <nav aria-label="Footer">
            <button type="button" onClick={() => go({ name: 'browse' })}>Lots</button>
            <button type="button" onClick={() => go({ name: 'create' })}>List a lot</button>
            <button type="button" onClick={() => go({ name: 'dashboard' })}>Dashboard</button>
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
        <Dialog title="Sign in to BidSphere" onClose={() => setAuthOpen(false)}>
          <Auth
            mode="login"
            onAuth={handleAuth}
            onGo={(next) => {
              setAuthOpen(false);
              go(next);
            }}
          />
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
