import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setToken, setStoredUser } from '../api';
import { config } from '../data/config';

export default function Auth({ mode = 'login', onAuth }) {
  const navigate = useNavigate();
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'gardener' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = isRegister
        ? await api.register(form)
        : await api.login({ email: form.email, password: form.password });
      setToken(res.token);
      setStoredUser(res.user);
      onAuth(res.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  function fillDemo() {
    setForm({ ...form, email: config.demoEmail, password: config.demoPassword });
  }

  return (
    <div className="wrap page">
      <div className="auth-shell">
        <div className="auth-card">
          <span className="eyebrow red">{isRegister ? 'Join SproutPlot' : 'Welcome back'}</span>
          <h1 style={{ fontSize: '2.6rem', margin: '8px 0 6px' }}>{isRegister ? 'Create your account' : 'Sign in'}</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            {isRegister
              ? 'Gardeners sow and tend. Coordinators also manage beds and the plant library.'
              : 'Your gardens, beds and watering list are waiting.'}
          </p>
          {error && (
            <p className="status error" role="alert" aria-live="assertive">{error}</p>
          )}
          <form onSubmit={submit} noValidate>
            {isRegister && (
              <div className="field">
                <label htmlFor="auth-name">Your name <span className="req" aria-hidden="true">*</span></label>
                <input
                  id="auth-name" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoComplete="name" placeholder="e.g. Akhand Pratap"
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="auth-email">Email <span className="req" aria-hidden="true">*</span></label>
              <input
                id="auth-email" type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email" placeholder="you@example.com"
              />
            </div>
            <div className="field">
              <label htmlFor="auth-password">Password <span className="req" aria-hidden="true">*</span></label>
              <input
                id="auth-password" type="password" required minLength={6} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder="At least 6 characters"
              />
            </div>
            {isRegister && (
              <div className="field">
                <label htmlFor="auth-role">Role</label>
                <select id="auth-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="gardener">Gardener — sow and tend</option>
                  <option value="coordinator">Coordinator — manage beds &amp; library</option>
                </select>
              </div>
            )}
            <button className="btn primary block" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>
          <p style={{ marginTop: 16 }}>
            {isRegister ? (
              <>Already have an account? <Link to="/login">Sign in</Link></>
            ) : (
              <>New here? <Link to="/register">Create an account</Link></>
            )}
          </p>
          <div className="demo-box">
            <strong>Try the demo garden:</strong> use the demo account — email{' '}
            <code>{config.demoEmail}</code> and password <code>{config.demoPassword}</code>.{' '}
            <button type="button" className="btn small" onClick={fillDemo} style={{ marginLeft: 6 }}>Fill demo details</button>
          </div>
        </div>
      </div>
    </div>
  );
}
