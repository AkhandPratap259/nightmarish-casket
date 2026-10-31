import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useShop } from '../context.jsx';

export default function Shop() {
  const { addToCart } = useShop();
  const [data, setData] = useState({ products: [], categories: ['All'], page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);

  async function load(page = 1) {
    setLoading(true);
    try {
      const q = new URLSearchParams({ search, category, sort, page, limit: 12 }).toString();
      setData(await api(`/products?${q}`));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(1); }, [search, category, sort]);

  return (
    <div>
      <div className="hero">
        <h1>ShopKart</h1>
        <p>Everyday essentials, electronics and home goods — with real auth, cart, orders and an admin dashboard.</p>
      </div>
      <div className="filters">
        <input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {data.categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="rating">Top rated</option>
        </select>
      </div>
      {loading ? <p>Loading products…</p> : (
        <div className="grid">
          {data.products.map((p) => (
            <div className="card" key={p._id}>
              <Link to={`/product/${p._id}`}><img src={p.image} alt={p.name} /></Link>
              <div className="card-body">
                <span className="badge">{p.category}</span>
                <Link to={`/product/${p._id}`}><h3>{p.name}</h3></Link>
                <div className="muted">★ {p.rating} · {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</div>
                <div className="price">₹{(p.price * 83).toLocaleString('en-IN')}</div>
                <button className="btn" disabled={p.stock === 0} onClick={() => addToCart(p)}>Add to cart</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {data.products.length === 0 && !loading && <p>No products match your search.</p>}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn secondary" disabled={data.page <= 1} onClick={() => load(data.page - 1)}>Previous</button>
        <span className="muted" style={{ alignSelf: 'center' }}>Page {data.page} of {data.pages}</span>
        <button className="btn secondary" disabled={data.page >= data.pages} onClick={() => load(data.page + 1)}>Next</button>
      </div>
      <p className="muted" style={{ marginTop: 16 }}>Prices are shown in ₹ for display (seed prices are in USD × 83). Checkout is a mock payment — no real money moves.</p>
    </div>
  );
}
