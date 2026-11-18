import { useState } from 'react';
import { api, setToken, setStoredUser } from '../api.js';
import { GOALS, config } from '../data/config.js';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('member');
  const [goal, setGoal] = useState('general');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body =
        mode === 'login'
          ? { email, password }
          : { name, email, password, role, goal };
      const data = mode === 'login' ? await api.login(body) : await api.register(body);
      setToken(data.token);
      setStoredUser(data.user);
      onAuth(data.user);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  function fillDemo(which) {
    setMode('login');
    setEmail(
      which === 'trainer'
        ? config.demoTrainerEmail
        : which === 'admin'
          ? config.demoAdminEmail
          : config.demoMemberEmail
    );
    setPassword(config.demoPassword);
    setError('');
  }

  return (
    <section className="section auth-page">
      <p className="section-label">(01) {mode === 'login' ? 'Sign in' : 'Create an account'}</p>
      <h1 className="section-title">
        {mode === 'login' ? (
          <>
            Welcome <em>back.</em>
          </>
        ) : (
          <>
            Start <em>training.</em>
          </>
        )}
      </h1>
      <div className="auth-split">
        <form className="form" onSubmit={submit} noValidate>
          {mode === 'register' && (
            <div className="field">
              <label htmlFor="auth-name">Full name</label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="Your name"
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="At least 8 characters"
            />
          </div>
          {mode === 'register' && (
            <>
              <div className="field">
                <label htmlFor="auth-role">I am joining as</label>
                <select id="auth-role" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="member">Member — I train</option>
                  <option value="trainer">Trainer — I coach members</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="auth-goal">Training goal</label>
                <select id="auth-goal" value={goal} onChange={(e) => setGoal(e.target.value)}>
                  {GOALS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--full"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>
        </form>
        <aside className="auth-demo" aria-label="Demo accounts">
          <h2>Try it without signing up</h2>
          <p>Three seeded demo accounts — pick one to fill the form, then sign in.</p>
          <ul className="demo-list">
            <li>
              <button type="button" className="btn btn--dark" onClick={() => fillDemo('member')}>
                Demo member
              </button>
              <span>{config.demoMemberEmail}</span>
            </li>
            <li>
              <button type="button" className="btn btn--dark" onClick={() => fillDemo('trainer')}>
                Demo trainer
              </button>
              <span>{config.demoTrainerEmail}</span>
            </li>
            <li>
              <button type="button" className="btn btn--dark" onClick={() => fillDemo('admin')}>
                Demo admin
              </button>
              <span>{config.demoAdminEmail}</span>
            </li>
          </ul>
          <p className="muted">All demo accounts use the password {config.demoPassword}</p>
        </aside>
      </div>
    </section>
  );
}
