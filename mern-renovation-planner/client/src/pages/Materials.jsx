import { useEffect, useState } from 'react';
import api, { getUser } from '../api';
import Modal from '../components/Modal';

const CATEGORIES = ['Paint', 'Tiles', 'Flooring', 'Wood & Ply', 'Cement & Putty', 'Electrical', 'Plumbing', 'Hardware', 'Other'];
const BASES = ['wall', 'floor', 'none'];

export default function Materials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Paint', unit: 'L', unitPrice: '', coverage: '', coverageBasis: 'wall', wastePct: 10 });
  const [formError, setFormError] = useState('');
  const user = getUser();
  const isAdmin = user?.role === 'admin';

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      const { data } = await api.get(`/materials?${params.toString()}`);
      setMaterials(data);
    } catch { setError('Could not load the materials catalogue.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [category, search]);

  async function create(e) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Enter a material name.'); return; }
    if (!form.unitPrice || Number(form.unitPrice) <= 0) { setFormError('Enter a unit price greater than ₹0.'); return; }
    try {
      const payload = { ...form, unitPrice: Number(form.unitPrice), wastePct: Number(form.wastePct) || 0, coverage: form.coverage ? Number(form.coverage) : null };
      await api.post('/materials', payload);
      setShowForm(false);
      setForm({ name: '', category: 'Paint', unit: 'L', unitPrice: '', coverage: '', coverageBasis: 'wall', wastePct: 10 });
      load();
    } catch (err) { setFormError(err.response?.data?.message || 'Could not add the material.'); }
  }

  async function remove(id, name) {
    if (!window.confirm(`Delete material "${name}"?`)) return;
    await api.delete(`/materials/${id}`);
    load();
  }

  return (
    <div className="container page ink-bleed">
      <p className="kicker">Priced from sample data</p>
      <h1>Materials catalogue</h1>
      <p>Sample Indian prices are shown for illustration — confirm current rates with your supplier before ordering. Admins can add or edit materials.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <label htmlFor="mat-cat" style={{ fontWeight: 700, alignSelf: 'center' }}>Category</label>
        <select id="mat-cat" value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: '10px 12px', border: '3px solid #111', minHeight: 48 }}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <label htmlFor="mat-search" style={{ fontWeight: 700, alignSelf: 'center' }}>Search</label>
        <input id="mat-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. paint" style={{ padding: '10px 12px', border: '3px solid #111', minHeight: 48 }} />
        {isAdmin && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add material</button>}
      </div>
      {loading ? (
        <><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /><p aria-live="polite">Loading materials…</p></>
      ) : error ? (
        <div className="state-box" role="alert"><h2>Something went wrong</h2><p>{error}</p></div>
      ) : materials.length === 0 ? (
        <div className="state-box"><h2>No materials found</h2><p>Try a different category or search term.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Material</th><th>Category</th><th>Price</th><th>Coverage</th><th>Waste</th><th></th></tr></thead>
            <tbody>
              {materials.map(m => (
                <tr key={m._id}>
                  <td><strong>{m.name}</strong> {m.isSample && <span className="tag">Sample price</span>}</td>
                  <td>{m.category}</td>
                  <td>₹{m.unitPrice.toLocaleString('en-IN')} / {m.unit}</td>
                  <td>{m.coverage ? `${m.coverage} m² per ${m.unit} (${m.coverageBasis})` : '—'}</td>
                  <td>{m.wastePct}%</td>
                  <td>{isAdmin && <button className="btn btn-ghost btn-sm" onClick={() => remove(m._id, m.name)}>Delete</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <Modal title="Add material" onClose={() => setShowForm(false)}>
          {formError && <div className="form-error" role="alert">{formError}</div>}
          <form onSubmit={create}>
            <div className="field"><label htmlFor="m-name">Name</label><input id="m-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-row">
              <div className="field"><label htmlFor="m-cat">Category</label><select id="m-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
              <div className="field"><label htmlFor="m-unit">Unit</label><input id="m-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required /></div>
            </div>
            <div className="form-row">
              <div className="field"><label htmlFor="m-price">Unit price (₹)</label><input id="m-price" type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required /></div>
              <div className="field"><label htmlFor="m-waste">Waste %</label><input id="m-waste" type="number" min="0" value={form.wastePct} onChange={(e) => setForm({ ...form, wastePct: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="field"><label htmlFor="m-cov">Coverage (m² per unit — leave blank if not area-based)</label><input id="m-cov" type="number" min="0" step="0.01" value={form.coverage} onChange={(e) => setForm({ ...form, coverage: e.target.value })} /></div>
              <div className="field"><label htmlFor="m-basis">Coverage basis</label><select id="m-basis" value={form.coverageBasis} onChange={(e) => setForm({ ...form, coverageBasis: e.target.value })}>{BASES.map(b => <option key={b}>{b}</option>)}</select></div>
            </div>
            <button className="btn btn-primary" type="submit">Add material</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
