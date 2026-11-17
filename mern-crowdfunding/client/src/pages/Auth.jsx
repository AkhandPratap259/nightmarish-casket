import { useEffect, useState } from 'react';
import { api, setToken, setStoredUser } from '../api';
import { config } from '../data/config';

export default function Auth({ mode = 'login', onAuth, onGo }) {
  const [formMode, setFormMode] = useState(mode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('backer');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFormMode(mode);
    setError('');
  }, [mode]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    if (formMode === 'register' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      const res =
        formMode === 'register'
          ? await api.register({ name: name.trim(), email: email.trim(), password, role })
          : await api.login({ email: email.trim(), password });
      setToken(res.token);
      setStoredUser(res.user);
      onAuth(res.user);
    } catch (err) {
      setError(err.message || 'Sign-in failed. Check your details and try again.');
    } finally {
      setBusy(false);
    }
  }

  function fillDemo(kind) {
    setFormMode('login');
    setError('');
    setEmail(
      kind === 'creator' ? config.demoCreatorEmail : kind === 'admin' ? config.demoAdminEmail : config.demoBackerEmail
    );
    setPassword(config.demoPassword);
  }

  return (
    <div className="auth-box">
      <div className="auth-toggle" role="group" aria-label="Sign in or register">
        <button type="button" className={formMode === 'login' ? 'is-active' : ''} aria-pressed={formMode === 'login'} onClick={() => setFormMode('login')}>
          Sign in
        </button>
        <button type="button" className={formMode === 'register' ? 'is-active' : ''} aria-pressed={formMode === 'register'} onClick={() => setFormMode('register')}>
          Register
        </button>
      </div>

      <form onSubmit={submit} noValidate>
        {formMode === 'register' ? (
          <>
            <div className="field">
              <label htmlFor="auth-name">Full name</label>
              <input id="auth-name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="auth-role">I want to join as</label>
              <select id="auth-role" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="backer">Backer — support campaigns</option>
                <option value="creator">Creator — launch campaigns</option>
              </select>
            </div>
          </>
        ) : null}
        <div className="field">
          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={formMode === 'register' ? 'new-password' : 'current-password'}
            required
          />
        </div>
        {error ? (
          <p className="form-error" role="alert" aria-live="assertive">{error}</p>
        ) : null}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Please wait…' : formMode === 'register' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <div className="demo-fill">
        <p className="hint-text">Demo accounts — fills the sign-in form; you still submit it yourself.</p>
        <div className="demo-buttons">
          <button type="button" className="btn btn-ghost btn-small" onClick={() => fillDemo('backer')}>
            Fill demo backer
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => fillDemo('creator')}>
            Fill demo creator
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => fillDemo('admin')}>
            Fill demo admin
          </button>
        </div>
      </div>

      <p className="hint-text auth-foot">
        {formMode === 'login' ? 'New to FundForge? Switch to Register above.' : 'Already have an account? Switch to Sign in above.'}
        {' '}
        <button type="button" className="link-btn" onClick={() => onGo({ name: 'browse' })}>
          Continue browsing without signing in
        </button>
      </p>
    </div>
  );
}
