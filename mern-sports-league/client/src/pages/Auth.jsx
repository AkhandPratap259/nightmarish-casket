import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setStoredUser, setToken } from '../api';
import { DEMO_ACCOUNTS } from '../data/config';

export default function Auth({ onAuth }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'fan' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = mode === 'login'
        ? await api.login({ email: form.email, password: form.password })
        : await api.register(form);
      setToken(res.token);
      setStoredUser(res.user);
      onAuth(res.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function fillDemo(account) {
    setMode('login');
    setForm({ ...form, email: account.email, password: account.password });
    setError('');
  }

  return (
    <div className="page form-page">
      <h1>{mode === 'login' ? 'Sign in' : 'Create an account'}</h1>
      <p className="page-head__lead">
        {mode === 'login'
          ? 'Organizers create leagues, captains log match events, fans follow along.'
          : 'Pick a role — organizers create leagues, captains run teams, fans follow the table.'}
      </p>
      <form onSubmit={submit} className="form-card">
        {error && <p className="error" role="alert">{error}</p>}
        {mode === 'register' && (
          <label>Full name
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} autoComplete="name" />
          </label>
        )}
        <label>Email
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
        </label>
        <label>Password
          <input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        {mode === 'register' && (
          <label>Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="fan">Fan — follow leagues</option>
              <option value="captain">Captain — run a team</option>
              <option value="organizer">Organizer — run a league</option>
            </select>
          </label>
        )}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
        </button>
      </form>

      <section className="demo-box" aria-labelledby="demo-title">
        <h2 id="demo-title">Try the demo accounts</h2>
        <p>One click fills the form — sign in to explore as that role.</p>
        <div className="demo-box__buttons">
          {DEMO_ACCOUNTS.map((a) => (
            <button key={a.email} type="button" className="btn btn--secondary btn--sm" onClick={() => fillDemo(a)}>
              {a.label} — {a.email}
            </button>
          ))}
        </div>
        <p className="demo-box__note">Demo password for all three: <code>PlayPulse123!</code></p>
      </section>
    </div>
  );
}
