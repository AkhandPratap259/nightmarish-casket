import { useState } from 'react';
import { api, setToken, setStoredUser } from '../api';
import { config } from '../data/config';
import Scramble from '../components/Scramble';

export default function Auth({ mode, onAuth, onGo }) {
  const [isLogin, setIsLogin] = useState(mode !== 'register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    if (!isLogin && !name.trim()) {
      setError('Your name is required to create an account.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const res = isLogin
        ? await api.login({ email: email.trim(), password })
        : await api.register({ name: name.trim(), email: email.trim(), password });
      setToken(res.token);
      setStoredUser(res.user);
      onAuth(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(which) {
    const map = {
      learner: config.demoEmail,
      instructor: config.demoInstructorEmail,
      admin: config.demoAdminEmail,
    };
    setIsLogin(true);
    setEmail(map[which]);
    setPassword(config.demoPassword);
    setError('');
  }

  return (
    <div className="auth-page">
      <p className="section-label">({isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'})</p>
      <h1>
        {isLogin ? 'Welcome back. ' : 'Start learning. '}
        <em><Scramble key={isLogin ? 'in' : 'up'} text={isLogin ? 'Your streak missed you.' : 'It takes a minute.'} /></em>
      </h1>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {!isLogin ? (
          <div className="field">
            <label htmlFor="auth-name">Your name</label>
            <input id="auth-name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
        </div>
        {error ? (
          <p className="form-error" role="alert">{error}</p>
        ) : null}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <p>
        {isLogin ? 'No account yet? ' : 'Already have an account? '}
        <button type="button" className="link-btn" onClick={() => setIsLogin((v) => !v)}>
          {isLogin ? 'Create one' : 'Sign in'}
        </button>
      </p>
      <div className="demo-fill">
        <p className="section-label">(DEMO ACCOUNTS — ONE CLICK)</p>
        <div className="btn-row">
          <button type="button" className="btn btn-ghost btn-small" onClick={() => fillDemo('learner')}>
            Learner
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => fillDemo('instructor')}>
            Instructor
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => fillDemo('admin')}>
            Admin
          </button>
        </div>
        <p className="hint-text">Demo password for all three: {config.demoPassword}</p>
      </div>
    </div>
  );
}
