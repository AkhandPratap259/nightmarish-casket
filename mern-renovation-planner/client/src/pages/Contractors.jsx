import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';

export default function Contractors() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trade, setTrade] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', trade: '', phone: '', rating: '' });
  const [formError, setFormError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/contractors${trade ? `?trade=${encodeURIComponent(trade)}` : ''}`);
      setContractors(data);
    } catch { setError('Could not load the contractor directory.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [trade]);

  async function create(e) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.trade.trim()) { setFormError('Name and trade are required.'); return; }
    try {
      await api.post('/contractors', { ...form, rating: Number(form.rating) || 0 });
      setShowForm(false);
      setForm({ name: '', trade: '', phone: '', rating: '' });
      load();
    } catch (err) { setFormError(err.response?.data?.message || 'Could not add the contractor.'); }
  }

  return (
    <div className="container page ink-bleed">
      <p className="kicker">Find the right hands</p>
      <h1>Contractor directory</h1>
      <p>Trades you can assign to tasks and request quotes from. Sample contacts are labelled as such.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <label htmlFor="c-trade" style={{ fontWeight: 700, alignSelf: 'center' }}>Filter by trade</label>
        <input id="c-trade" value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="e.g. Painting" style={{ padding: '10px 12px', border: '3px solid #111', minHeight: 48 }} />
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add contractor</button>
      </div>
      {loading ? (
        <><div className="skeleton" /><div className="skeleton" /><p aria-live="polite">Loading contractors…</p></>
      ) : error ? (
        <div className="state-box" role="alert"><h2>Something went wrong</h2><p>{error}</p></div>
      ) : contractors.length === 0 ? (
        <div className="state-box"><h2>No contractors found</h2><p>Add the first one — a painter, plumber, electrician or mason.</p></div>
      ) : (
        <div className="grid grid-3">
          {contractors.map(c => (
            <article key={c._id} className="card wobble">
              <span className="tag tag-teal">{c.trade}</span>{' '}
              {c.isSample && <span className="tag">Sample contact</span>}
              <h3 style={{ marginTop: 10 }}>{c.name}</h3>
              <p>Rating: <strong>{c.rating ? `${c.rating} / 5` : 'Not rated yet'}</strong></p>
              <p>{c.phone || 'No phone on file'}</p>
            </article>
          ))}
        </div>
      )}
      {showForm && (
        <Modal title="Add contractor" onClose={() => setShowForm(false)}>
          {formError && <div className="form-error" role="alert">{formError}</div>}
          <form onSubmit={create}>
            <div className="field"><label htmlFor="ct-name">Name</label><input id="ct-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="field"><label htmlFor="ct-trade">Trade</label><input id="ct-trade" value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} placeholder="e.g. Painting & Finishing" required /></div>
            <div className="form-row">
              <div className="field"><label htmlFor="ct-phone">Phone</label><input id="ct-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="field"><label htmlFor="ct-rating">Rating (0–5)</label><input id="ct-rating" type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></div>
            </div>
            <button className="btn btn-primary" type="submit">Add contractor</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
