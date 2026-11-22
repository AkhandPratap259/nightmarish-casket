import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { AREAS } from '../data/content';

export default function OfferingForm({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({
    service: '',
    price: '',
    durationMin: '',
    areas: [],
    bio: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    api.listServices().then((d) => setServices(d.services)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api
      .getOffering(id)
      .then((d) => {
        const o = d.offering;
        setForm({
          service: o.service?._id || '',
          price: String(o.price),
          durationMin: String(o.durationMin),
          areas: o.areas || [],
          bio: o.bio || '',
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function toggleArea(area) {
    setForm((f) => ({
      ...f,
      areas: f.areas.includes(area) ? f.areas.filter((a) => a !== area) : [...f.areas, area],
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.service) return setError('Please choose a service.');
    if (Number(form.price) < 0 || !form.price) return setError('Please enter a valid price.');
    if (Number(form.durationMin) < 15) return setError('Duration must be at least 15 minutes.');
    setBusy(true);
    try {
      const body = {
        service: form.service,
        price: Number(form.price),
        durationMin: Number(form.durationMin),
        areas: form.areas,
        bio: form.bio,
      };
      if (isEdit) await api.updateOffering(id, body);
      else await api.createOffering(body);
      navigate('/provider');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!user || user.role !== 'provider') {
    return (
      <main className="page">
        <h1 className="page-title">{isEdit ? 'Edit offering' : 'New offering'}</h1>
        <p>Please <Link to="/login">sign in</Link> as a provider to manage offerings.</p>
      </main>
    );
  }

  return (
    <main className="page">
      <p className="section-label">{isEdit ? 'Edit offering' : 'New offering'}</p>
      <h1 className="page-title" aria-label={isEdit ? 'Change your offering' : 'List a service you offer'}>
        {isEdit ? (
          <>Change your <em>offering</em></>
        ) : (
          <>List a <em>service</em> you offer</>
        )}
      </h1>
      {loading && <p className="muted" role="status">Loading…</p>}
      <form className="form form-narrow auth-form-panel" onSubmit={submit} noValidate>
        <label className="field">
          <span>Service</span>
          <select
            value={form.service}
            onChange={(e) => {
              const svc = services.find((s) => s._id === e.target.value);
              setForm({
                ...form,
                service: e.target.value,
                durationMin: svc ? String(svc.durationMin) : form.durationMin,
              });
            }}
            required
          >
            <option value="">Choose a service…</option>
            {services.map((s) => (
              <option key={s._id} value={s._id}>
                {s.category} — {s.name} (guide ₹{s.basePrice})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Your price (₹)</span>
          <input
            type="number"
            min="0"
            step="1"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
        </label>
        <label className="field">
          <span>Duration (minutes)</span>
          <input
            type="number"
            min="15"
            max="480"
            step="5"
            value={form.durationMin}
            onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
            required
          />
        </label>
        <fieldset className="area-fieldset">
          <legend>Areas you serve</legend>
          <div className="area-chips">
            {AREAS.map((a) => (
              <button
                key={a}
                type="button"
                className={`chip ${form.areas.includes(a) ? 'chip--active' : ''}`}
                aria-pressed={form.areas.includes(a)}
                onClick={() => toggleArea(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="field">
          <span>Short note for customers (optional)</span>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            maxLength={500}
            placeholder="What makes your work different?"
          />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create offering'}
          </button>
          <Link className="btn btn-ghost" to="/provider">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
