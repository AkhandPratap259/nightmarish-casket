import { useState } from 'react';
import { api, CATEGORIES, CATEGORY_LABELS, CONDITION_LABELS } from '../api';
import { ANTI_SNIPE_NOTE } from '../data/config';

const DURATIONS = [
  { value: 1, label: '1 hour' },
  { value: 6, label: '6 hours' },
  { value: 24, label: '24 hours' },
  { value: 72, label: '3 days' },
  { value: 168, label: '7 days' },
];

export default function CreateAuction({ user, onCreated, onGo, notify }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'collectibles',
    condition: 'used',
    city: '',
    startingBid: '',
    minIncrement: '100',
    durationHours: 24,
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  if (!user) {
    return (
      <div className="section">
        <p className="label">(List a lot)</p>
        <h1>Sign in to list a lot.</h1>
        <p className="lede">Sellers list lots; bidders bid on them. Create a seller account to put something up for auction.</p>
        <button type="button" className="btn btn-primary" onClick={() => onGo({ name: 'auth', mode: 'register' })}>
          Create a seller account
        </button>
      </div>
    );
  }
  if (user.role === 'bidder') {
    return (
      <div className="section">
        <p className="label">(List a lot)</p>
        <h1>Your account is a bidder account.</h1>
        <p className="lede">
          Only seller accounts can list lots. Register a new account and choose “Seller” as the account type to list
          your first lot.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => onGo({ name: 'auth', mode: 'register' })}>
          Register as a seller
        </button>
      </div>
    );
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  }

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = 'Give the lot a title';
    if (form.title.trim().length > 120) next.title = 'Keep the title under 120 characters';
    if (!form.description.trim()) next.description = 'Describe the lot so bidders know what it is';
    if (!form.city.trim()) next.city = 'Add the city the lot is in';
    if (!Number(form.startingBid) || Number(form.startingBid) < 1) next.startingBid = 'Starting bid must be at least ₹1';
    if (form.minIncrement !== '' && (!Number(form.minIncrement) || Number(form.minIncrement) < 10)) {
      next.minIncrement = 'Minimum increment must be at least ₹10';
    }
    setErrors(next);
    if (Object.keys(next).length) {
      setFormError('Fix the highlighted fields and try again.');
      return;
    }
    setFormError('');
    setBusy(true);
    try {
      const endsAt = new Date(Date.now() + Number(form.durationHours) * 60 * 60 * 1000).toISOString();
      const data = await api.createAuction({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        condition: form.condition,
        city: form.city.trim(),
        startingBid: Number(form.startingBid),
        minIncrement: Number(form.minIncrement) || 100,
        endsAt,
      });
      notify(`Lot listed: “${data.auction.title}”`, 'success');
      onCreated(data.auction.id);
    } catch (err) {
      setFormError(err.message || 'Could not list the lot');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <p className="label">(List a lot)</p>
      <h1>
        Put something <em>on the block.</em>
      </h1>
      <p className="lede">
        Your lot goes live the moment you list it. {ANTI_SNIPE_NOTE} Listed lots are sample listings for trying the
        app — no real item is sold and no payment is collected.
      </p>
      <form onSubmit={submit} className="form-narrow" noValidate>
        <div className="field">
          <label htmlFor="lot-title">Lot title</label>
          <input id="lot-title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Vintage HMT watch" aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'err-title' : undefined} />
          {errors.title ? <p className="error-text" id="err-title" role="alert">{errors.title}</p> : null}
        </div>
        <div className="field">
          <label htmlFor="lot-desc">Description</label>
          <textarea id="lot-desc" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Condition, history, what is included…" aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'err-desc' : undefined} />
          {errors.description ? <p className="error-text" id="err-desc" role="alert">{errors.description}</p> : null}
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="lot-category">Category</label>
            <select id="lot-category" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="lot-condition">Condition</label>
            <select id="lot-condition" value={form.condition} onChange={(e) => set('condition', e.target.value)}>
              {Object.entries(CONDITION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="lot-city">City</label>
            <input id="lot-city" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Azamgarh" aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? 'err-city' : undefined} />
            {errors.city ? <p className="error-text" id="err-city" role="alert">{errors.city}</p> : null}
          </div>
          <div className="field">
            <label htmlFor="lot-duration">Auction length</label>
            <select id="lot-duration" value={form.durationHours} onChange={(e) => set('durationHours', Number(e.target.value))}>
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="lot-start">Starting bid (₹)</label>
            <input id="lot-start" type="number" min="1" value={form.startingBid} onChange={(e) => set('startingBid', e.target.value)} placeholder="2500" aria-invalid={Boolean(errors.startingBid)} aria-describedby={errors.startingBid ? 'err-start' : undefined} />
            {errors.startingBid ? <p className="error-text" id="err-start" role="alert">{errors.startingBid}</p> : null}
          </div>
          <div className="field">
            <label htmlFor="lot-inc">Minimum increment (₹)</label>
            <input id="lot-inc" type="number" min="10" step="10" value={form.minIncrement} onChange={(e) => set('minIncrement', e.target.value)} aria-invalid={Boolean(errors.minIncrement)} aria-describedby={errors.minIncrement ? 'err-inc' : undefined} />
            {errors.minIncrement ? <p className="error-text" id="err-inc" role="alert">{errors.minIncrement}</p> : null}
          </div>
        </div>
        {formError ? <p className="error-text" role="alert">{formError}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Listing…' : 'List this lot'}
        </button>
      </form>
    </div>
  );
}
