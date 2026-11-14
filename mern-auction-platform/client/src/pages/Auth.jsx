import { useState } from 'react';
import { api, setToken, setStoredUser } from '../api';
import { config } from '../data/config';

export default function Auth({ mode, onAuth, onGo }) {
  const [isLogin, setIsLogin] = useState(mode !== 'register');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'bidder' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  }

  function fillDemo(email) {
    setForm((f) => ({ ...f, email, password: config.demoPassword, name: f.name || 'Demo Bidder' }));
    setIsLogin(true);
    setFormError('');
  }

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (!isLogin && !form.name.trim()) next.name = 'Add your name';
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address';
    if (!form.password || form.password.length < 8) next.password = 'Password must be at least 8 characters';
    setErrors(next);
    if (Object.keys(next).length) {
      setFormError('Fix the highlighted fields and try again.');
      return;
    }
    setFormError('');
    setBusy(true);
    try {
      const data = isLogin
        ? await api.login({ email: form.email, password: form.password })
        : await api.register({ name: form.name, email: form.email, password: form.password, role: form.role });
      setToken(data.token);
      setStoredUser(data.user);
      onAuth(data.user);
    } catch (err) {
      setFormError(err.message || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <p className="label">(Your account)</p>
      <h1>
        {isLogin ? (
          <>Welcome <em>back.</em></>
        ) : (
          <>Join the <em>floor.</em></>
        )}
      </h1>
      <p className="lede">
        {isLogin
          ? 'Sign in to bid, watch lots and list your own.'
          : 'Bidder accounts bid and watch. Seller accounts list lots too — pick the one that fits.'}
      </p>

      <div className="demo-box" aria-label="Demo accounts">
        <p className="demo-title">Try it without registering — demo accounts</p>
        <div className="demo-buttons">
          <button type="button" className="btn btn-ghost btn-small" onClick={() => fillDemo(config.demoEmail)}>
            Bidder · {config.demoEmail}
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => fillDemo(config.demoSellerEmail)}>
            Seller · {config.demoSellerEmail}
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => fillDemo(config.demoAdminEmail)}>
            Admin · {config.demoAdminEmail}
          </button>
        </div>
        <p className="field-hint">Password for all three: {config.demoPassword}. Then press “Sign in”.</p>
      </div>

      <form onSubmit={submit} className="form-narrow" noValidate>
        {!isLogin ? (
          <>
            <div className="field">
              <label htmlFor="auth-name">Your name</label>
              <input id="auth-name" value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'err-name' : undefined} />
              {errors.name ? <p className="error-text" id="err-name" role="alert">{errors.name}</p> : null}
            </div>
            <fieldset>
              <legend>Account type</legend>
              <label className="radio-row">
                <input type="radio" name="role" value="bidder" checked={form.role === 'bidder'} onChange={() => set('role', 'bidder')} />
                Bidder — bid on lots and watch them
              </label>
              <label className="radio-row">
                <input type="radio" name="role" value="seller" checked={form.role === 'seller'} onChange={() => set('role', 'seller')} />
                Seller — list lots as well as bid
              </label>
            </fieldset>
          </>
        ) : null}
        <div className="field">
          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'err-email' : undefined} />
          {errors.email ? <p className="error-text" id="err-email" role="alert">{errors.email}</p> : null}
        </div>
        <div className="field">
          <label htmlFor="auth-password">Password</label>
          <input id="auth-password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} autoComplete={isLogin ? 'current-password' : 'new-password'} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'err-password' : undefined} />
          {errors.password ? <p className="error-text" id="err-password" role="alert">{errors.password}</p> : null}
        </div>
        {formError ? <p className="error-text" role="alert">{formError}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <p className="switch-auth">
        {isLogin ? 'New here? ' : 'Already have an account? '}
        <button type="button" className="link-btn" onClick={() => { setIsLogin(!isLogin); setFormError(''); }}>
          {isLogin ? 'Create an account' : 'Sign in'}
        </button>
      </p>
      <p>
        <button type="button" className="link-btn" onClick={() => onGo({ name: 'browse' })}>← Back to the lots</button>
      </p>
    </div>
  );
}
