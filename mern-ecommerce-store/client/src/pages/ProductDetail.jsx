import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, useShop } from '../context.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useShop();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  useEffect(() => { api(`/products/${id}`).then((d) => setProduct(d.product)); }, [id]);
  if (!product) return <p>Loading product…</p>;
  return (
    <div className="detail">
      <img src={product.image} alt={product.name} />
      <div>
        <span className="badge">{product.category}</span>
        <h1>{product.name}</h1>
        <p className="muted">★ {product.rating} · {product.stock} in stock</p>
        <p>{product.description}</p>
        <div className="price" style={{ fontSize: 26 }}>₹{(product.price * 83).toLocaleString('en-IN')}</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <input type="number" min="1" max={product.stock} value={qty} onChange={(e) => setQty(Number(e.target.value))} style={{ width: 80, padding: 10, borderRadius: 8, border: '1px solid #d5dce3' }} />
          <button className="btn" onClick={() => addToCart(product, qty)}>Add to cart</button>
        </div>
      </div>
    </div>
  );
}
