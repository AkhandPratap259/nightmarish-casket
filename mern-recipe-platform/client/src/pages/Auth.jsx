import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setStoredUser, setToken } from '../api';
import { DEMO_ACCOUNTS } from '../data/content';

export default function Auth({ mode, onAuth }) {
  const isLogin = mode === 'login';
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!isLogin && name.trim().length < 2) return setError('Please enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Please enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    try {
      const data = isLogin
        ? await api.login({ email, password })
        : await api.register({ name, email, password });
      setToken(data.token);
      setStoredUser(data.user);
      onAuth(data.user);
      navigate('/browse');
    } catch (err) {
      setError(err.message || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  function fillDemo(account) {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  }

  return (
    <main className="page auth-page">
      <p className="section-label">(01) — {isLogin ? 'Sign in' : 'Create account'}</p>
      <h1>{isLogin ? 'Welcome <em>back</em>' : 'Start <em>cooking</em>'}</h1>
      <div className="auth-split">
        <form className="auth-form" onSubmit={submit} noValidate>
          {!isLogin && (
            <div className="field">
              <label htmlFor="auth-name">Your name</label>
              <input id="auth-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
          )}
          <div className="field">
            <label htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label htmlFor="auth-password">Password</label>
            <input id="auth-password" type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </div>
          {error && <p className="error-text" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
          </button>
          <p className="muted small">
            {isLogin ? (
              <>No account yet? <Link to="/register">Create one</Link></>
            ) : (
              <>Already have an account? <Link to="/login">Sign in</Link></>
            )}
          </p>
        </form>
        <aside className="auth-demo" aria-label="Demo accounts">
          <h2>Try it without signing up</h2>
          <p className="muted small">Demo accounts for local testing. Each uses the password shown on its button.</p>
          <ul className="demo-list">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button type="button" className="btn btn-ghost demo-btn" onClick={() => fillDemo(a)}>
                  {a.label} — {a.email}
                </button>
                <p className="muted small">{a.note}</p>
              </li>
            ))}
          </ul>
          <p className="muted small">Fill the form with a demo account, then press “Sign in”.</p>
        </aside>
      </div>
    </main>
  );
}
