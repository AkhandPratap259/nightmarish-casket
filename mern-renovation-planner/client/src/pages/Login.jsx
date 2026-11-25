import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { saveAuth } from '../api';

export default function Login() {
  const [email, setEmail] = useState('demo@homedraft.example');
  const [password, setPassword] = useState('HomeDraft123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!email.includes('@')) { setError('Enter a valid email address.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      saveAuth(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Sign-in failed. Check your details and try again.');
    } finally { setLoading(false); }
  }

  return (
    <div className="container page ink-bleed" style={{ maxWidth: 560 }}>
      <p className="kicker">Welcome back</p>
      <h1>Sign in to HomeDraft</h1>
      <div className="card" style={{ marginTop: 20 }}>
        {error && <div className="form-error" role="alert">{error}</div>}
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p style={{ marginTop: 16, fontSize: '0.9rem' }}>Demo accounts — homeowner <strong>demo@homedraft.example</strong>, contractor <strong>contractor@homedraft.example</strong>, admin <strong>admin@homedraft.example</strong> — all with password <strong>HomeDraft123!</strong></p>
        <p style={{ fontSize: '0.9rem' }}>No account yet? <Link to="/register">Create one</Link>.</p>
      </div>
    </div>
  );
}
