import React, { useEffect, useState } from 'react';
import { api, useShop } from '../context.jsx';

export default function Admin() {
  const { token, user } = useShop();
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', price: '', category: '', image: '', stock: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  async function load() {
    setStats(await api('/admin/stats', { token }));
    setProducts((await api('/products?limit=24', { token })).products);
    setOrders((await api('/orders', { token })).orders);
  }
  useEffect(() => { if (token) load().catch(() => {}); }, [token]);
  if (!user || user.role !== 'admin') return <p>Admin access required. Register the first account to become admin.</p>;
  async function createProduct(e) {
    e.preventDefault();
    await api('/products', { method: 'POST', token, body: { ...form, price: Number(form.price), stock: Number(form.stock) } });
    setForm({ name: '', description: '', price: '', category: '', image: '', stock: '' }); load();
  }
  return (
    <div>
      <h1>Admin dashboard</h1>
      {stats && <div className="grid" style={{ marginBottom: 24 }}>
        <div className="card"><div className="card-body"><span className="muted">Revenue (mock)</span><strong>${stats.revenue}</strong></div></div>
        <div className="card"><div className="card-body"><span className="muted">Orders</span><strong>{stats.orders}</strong></div></div>
        <div className="card"><div className="card-body"><span className="muted">Products</span><strong>{stats.products}</strong></div></div>
      </div>}
      <h2>Add product</h2>
      <form className="form" style={{ maxWidth: '100%', marginBottom: 24 }} onSubmit={createProduct}>
        <div className="field"><label>Name</label><input value={form.name} onChange={set('name')} required /></div>
        <div className="field"><label>Description</label><textarea value={form.description} onChange={set('description')} required rows="2" /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label>Price (USD)</label><input type="number" step="0.01" value={form.price} onChange={set('price')} required /></div>
          <div className="field" style={{ flex: 1 }}><label>Stock</label><input type="number" value={form.stock} onChange={set('stock')} required /></div>
        </div>
        <div className="field"><label>Category</label><input value={form.category} onChange={set('category')} required /></div>
        <div className="field"><label>Image URL</label><input value={form.image} onChange={set('image')} required /></div>
        <button className="btn">Add product</button>
      </form>
      <h2>All orders</h2>
      <table className="table"><thead><tr><th>Date</th><th>Customer</th><th>Total</th><th>Status</th><th>Change status</th></tr></thead>
        <tbody>{orders.map((o) => (
          <tr key={o._id}><td>{new Date(o.createdAt).toLocaleDateString()}</td><td>{o.user?.name}</td><td>${o.total}</td><td>{o.status}</td>
            <td><select value={o.status} onChange={async (e) => { await api(`/orders/${o._id}/status`, { method: 'PUT', token, body: { status: e.target.value } }); load(); }}>
              {['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
            </select></td></tr>
        ))}</tbody></table>
      <h2 style={{ marginTop: 24 }}>Products ({products.length})</h2>
      <table className="table"><thead><tr><th>Name</th><th>Price</th><th>Stock</th><th></th></tr></thead>
        <tbody>{products.map((p) => (
          <tr key={p._id}><td>{p.name}</td><td>${p.price}</td><td>{p.stock}</td>
            <td><button className="btn danger" onClick={async () => { await api(`/products/${p._id}`, { method: 'DELETE', token }); load(); }}>Delete</button></td></tr>
        ))}</tbody></table>
    </div>
  );
}
