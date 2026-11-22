import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setToken, setStoredUser } from '../api';
import { DEMO_ACCOUNTS } from '../data/content';

export default function Auth({ mode, onAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer', city: 'Azamgarh' });
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
      navigate(data.user.role === 'provider' ? '/provider' : data.user.role === 'admin' ? '/admin' : '/browse');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function demoLogin(account) {
    setError('');
    setBusy(true);
    try {
      const data = await api.login({ email: account.email, password: account.password });
      setToken(data.token);
      setStoredUser(data.user);
      onAuth(data.user);
      navigate(data.user.role === 'provider' ? '/provider' : data.user.role === 'admin' ? '/admin' : '/browse');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page auth-page">
      <p className="section-label">{isLogin ? 'Welcome back' : 'Join TaskTrove'}</p>
      <h1 className="page-title" aria-label={isLogin ? 'Sign in to book a service' : 'Create your account'}>
        {isLogin ? (
          <>Sign in to <em>book</em> a service</>
        ) : (
          <>Create your <em>account</em></>
        )}
      </h1>

      <div className="auth-split">
        <div className="auth-form-panel">
        <form className="form" onSubmit={submit} noValidate>
          {!isLogin && (
            <>
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
              <label className="field">
                <span>I am joining as</span>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="customer">Customer — I need services</option>
                  <option value="provider">Provider — I offer services</option>
                </select>
              </label>
              <label className="field">
                <span>City / area</span>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  autoComplete="address-level2"
                />
              </label>
            </>
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
          <p className="form-switch">
            {isLogin ? (
              <>
                New to TaskTrove? <Link to="/register">Create an account</Link>
              </>
            ) : (
              <>
                Already have an account? <Link to="/login">Sign in</Link>
              </>
            )}
          </p>
        </form>
        </div>

        <aside className="demo-panel" aria-label="Demo accounts">
          <p className="section-label">Try it now</p>
          <h2 className="demo-title" aria-label="Demo accounts, no sign-up needed">
            Demo accounts, <em>no sign-up</em> needed
          </h2>
          <p className="muted">
            One tap signs you in with a seeded demo account. Demo data is illustrative — it
            shows how the marketplace works.
          </p>
          <ul className="demo-list">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  className="demo-btn"
                  onClick={() => demoLogin(account)}
                  disabled={busy}
                >
                  <span className="demo-role">{account.role}</span>
                  <span className="demo-email">{account.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
