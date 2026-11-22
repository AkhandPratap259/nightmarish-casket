import { useCallback, useEffect, useRef, useState } from 'react';
import { api, setToken, setStoredUser, getStoredUser } from './api';
import { config } from './data/config';
import { getSocket, disconnectSocket } from './socket';
import Cursor from './components/Cursor';
import Dialog from './components/Dialog';
import Home from './pages/Home';
import Browse from './pages/Browse';
import CampaignDetail from './pages/CampaignDetail';
import CreateCampaign from './pages/CreateCampaign';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Auth from './pages/Auth';

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [view, setView] = useState({ name: 'home' });
  const [toasts, setToasts] = useState([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [menuOpen, setMenuOpen] = useState(false);
  const [pledgeTick, setPledgeTick] = useState(0);
  const [curtain, setCurtain] = useState('idle'); // idle | closing | opening
  const curtainTimers = useRef([]);
  const toastId = useRef(0);

  // Clear curtain timers on unmount.
  useEffect(() => {
    const timers = curtainTimers.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const notify = useCallback((message, kind = 'info') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  // Route change with an E1 curtain wipe (fluid liquid). The view swaps
  // while the curtain covers the screen, then the curtain wipes away.
  // Under prefers-reduced-motion the switch is instant, no curtain.
  const go = useCallback((next) => {
    setMenuOpen(false);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setView(next);
      window.scrollTo({ top: 0 });
      return;
    }
    if (curtain !== 'idle') {
      setView(next);
      window.scrollTo({ top: 0 });
      return;
    }
    setCurtain('closing');
    curtainTimers.current.push(
      window.setTimeout(() => {
        setView(next);
        window.scrollTo({ top: 0 });
        setCurtain('opening');
        curtainTimers.current.push(window.setTimeout(() => setCurtain('idle'), 580));
      }, 470)
    );
  }, [curtain]);

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

  // Close the mobile menu with Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Live socket: on a campaign detail page, join its room and surface
  // new pledges as a toast; the detail page refreshes via pledgeTick.
  useEffect(() => {
    if (view.name !== 'campaign' || !view.id) {
      disconnectSocket();
      return undefined;
    }
    const socket = getSocket(view.id);
    const onPledge = (payload) => {
      if (!payload || payload.campaignId !== view.id) return;
      notify(`New pledge: ${payload.backerName || 'A backer'} backed ${payload.amount ? `₹${Number(payload.amount).toLocaleString('en-IN')}` : 'this campaign'}`, 'success');
      setPledgeTick((t) => t + 1);
    };
    socket.on('pledge:new', onPledge);
    return () => {
      socket.off('pledge:new', onPledge);
    };
  }, [view.name, view.id, notify]);

  function handleAuth(nextUser) {
    setUser(nextUser);
    setStoredUser(nextUser);
    setAuthOpen(false);
    notify(`Signed in as ${nextUser.name}`, 'success');
    go({ name: 'dashboard' });
  }

  function signOut() {
    setToken(null);
    setStoredUser(null);
    setUser(null);
    disconnectSocket();
    notify('Signed out', 'info');
    go({ name: 'home' });
  }

  function requireAuth(mode = 'login') {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  const navLinks = [
    { label: 'Home', view: { name: 'home' } },
    { label: 'Browse', view: { name: 'browse' } },
    { label: 'Dashboard', view: { name: 'dashboard' } },
    { label: 'Create', view: { name: 'create' } },
  ];
  if (user?.role === 'admin') navLinks.push({ label: 'Admin', view: { name: 'admin' } });

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to main content</a>
      <Cursor />
      <header className="topbar">
        <div className="nav-inner">
          <button type="button" className="logo" onClick={() => go({ name: 'home' })} aria-label="FundForge — home">
            <span className="logo-mark" aria-hidden="true">F</span> FundForge
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
                <span className="nav-user">{user.name} · {user.role}</span>
                <button type="button" className="btn btn-ghost btn-small" onClick={signOut}>
                  Sign out
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary btn-small" onClick={() => requireAuth('login')}>
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
              <button type="button" onClick={() => { setMenuOpen(false); requireAuth('login'); }}>Sign in</button>
            )}
          </nav>
        ) : null}
      </header>

      <main id="main">
        {view.name === 'home' ? (
          <Home user={user} onGo={go} onRequireAuth={requireAuth} />
        ) : view.name === 'browse' ? (
          <Browse onGo={go} />
        ) : view.name === 'campaign' ? (
          <CampaignDetail
            campaignId={view.id}
            hint={view.hint}
            user={user}
            onGo={go}
            onRequireAuth={requireAuth}
            notify={notify}
            pledgeTick={pledgeTick}
          />
        ) : view.name === 'create' ? (
          <CreateCampaign user={user} onGo={go} onRequireAuth={requireAuth} notify={notify} />
        ) : view.name === 'dashboard' ? (
          <Dashboard user={user} onGo={go} onRequireAuth={requireAuth} notify={notify} />
        ) : view.name === 'admin' ? (
          <Admin user={user} onGo={go} />
        ) : null}
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <p className="footer-brand">FundForge — fund the ideas that matter.</p>
          <p className="footer-note">
            A demo crowdfunding platform. Campaigns labelled “Sample campaign” are seeded examples;
            pledges are mock only and no real money moves.
          </p>
          <nav aria-label="Footer">
            <button type="button" onClick={() => go({ name: 'home' })}>Home</button>
            <button type="button" onClick={() => go({ name: 'browse' })}>Browse</button>
            <button type="button" onClick={() => go({ name: 'dashboard' })}>Dashboard</button>
            <button type="button" onClick={() => go({ name: 'create' })}>Start a campaign</button>
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
        <Dialog title={authMode === 'register' ? 'Create your FundForge account' : 'Sign in to FundForge'} onClose={() => setAuthOpen(false)}>
          <Auth mode={authMode} onAuth={handleAuth} onGo={go} />
        </Dialog>
      ) : null}

      <div className={`curtain${curtain === 'closing' ? ' is-closing' : curtain === 'opening' ? ' is-opening' : ''}`} aria-hidden="true">
        <div className="curtain-panel curtain-panel-b" />
        <div className="curtain-panel curtain-panel-a" />
        <span className="curtain-mark">FundForge ✦</span>
      </div>

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
