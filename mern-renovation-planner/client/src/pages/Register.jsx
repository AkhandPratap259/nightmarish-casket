import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { saveAuth } from '../api';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'homeowner' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (form.name.trim().length < 2) { setError('Enter your name.'); return; }
    if (!form.email.includes('@')) { setError('Enter a valid email address.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      saveAuth(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally { setLoading(false); }
  }

  return (
    <div className="container page ink-bleed" style={{ maxWidth: 560 }}>
      <p className="kicker">Start planning</p>
      <h1>Create your account</h1>
      <div className="card" style={{ marginTop: 20 }}>
        {error && <div className="form-error" role="alert">{error}</div>}
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password (min. 8 characters)</label>
            <input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" />
          </div>
          <div className="field">
            <label htmlFor="role">I am a…</label>
            <select id="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="homeowner">Homeowner</option>
              <option value="contractor">Contractor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
        </form>
        <p style={{ fontSize: '0.9rem', marginTop: 16 }}>Already have an account? <Link to="/login">Sign in</Link>.</p>
      </div>
    </div>
  );
}
