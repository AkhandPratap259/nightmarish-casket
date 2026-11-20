import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setToken, setStoredUser } from '../api';
import { DEMO_ACCOUNT } from '../data/content';

export default function Auth({ mode, onAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = isLogin
        ? await api.login({ email: form.email, password: form.password })
        : await api.register(form);
      setToken(data.token);
      setStoredUser(data.user);
      onAuth(data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function demoLogin() {
    setError('');
    setBusy(true);
    try {
      const data = await api.login({ email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password });
      setToken(data.token);
      setStoredUser(data.user);
      onAuth(data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page auth-page">
      <p className="section-label">(01) {isLogin ? 'Welcome back' : 'Join FairShare'}</p>
      <h1 className="page-title">
        {isLogin ? (
          <>Sign in to <em>settle up</em></>
        ) : (
          <>Create your <em>account</em></>
        )}
      </h1>

      <div className="auth-split">
        <form className="form" onSubmit={submit} noValidate>
          {!isLogin && (
            <label className="field">
              <span>Full name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoComplete="name"
              />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
          </button>
          <p className="form-switch" aria-live="polite">
            {isLogin ? (
              <>
                New to FairShare? <Link to="/register">Create an account</Link>
              </>
            ) : (
              <>
                Already have an account? <Link to="/login">Sign in</Link>
              </>
            )}
          </p>
        </form>

        <aside className="demo-panel" aria-label="Demo account">
          <p className="section-label">(02) Try it now</p>
          <h2 className="demo-title">
            Demo account, <em>no sign-up</em> needed
          </h2>
          <p className="muted">
            One tap signs you in with the seeded demo account, which comes with a
            sample group and expenses. Demo data is illustrative.
          </p>
          <button type="button" className="demo-btn" onClick={demoLogin} disabled={busy}>
            <span className="demo-role">Demo user</span>
            <span className="demo-email">{DEMO_ACCOUNT.email}</span>
          </button>
        </aside>
      </div>
    </main>
  );
}
