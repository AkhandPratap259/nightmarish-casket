import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, useShop } from '../context.jsx';

export default function Auth({ mode }) {
  const { login } = useShop();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setError('');
    try {
      const data = await api(`/auth/${mode}`, { method: 'POST', body: form });
      login(data); navigate('/');
    } catch (err) { setError(err.message); }
  }
  return (
    <form className="form" onSubmit={submit}>
      <h2>{mode === 'login' ? 'Log in' : 'Create account'}</h2>
      {mode === 'register' && <p className="muted">The first account registered becomes the admin, so you can try the admin dashboard.</p>}
      {error && <div className="error">{error}</div>}
      {mode === 'register' && <div className="field"><label>Name</label><input value={form.name} onChange={set('name')} required /></div>}
      <div className="field"><label>Email</label><input type="email" value={form.email} onChange={set('email')} required /></div>
      <div className="field"><label>Password</label><input type="password" value={form.password} onChange={set('password')} required /></div>
      <button className="btn">{mode === 'login' ? 'Log in' : 'Register'}</button>
    </form>
  );
}
