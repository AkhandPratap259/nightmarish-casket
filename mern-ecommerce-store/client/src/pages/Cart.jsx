import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, useShop } from '../context.jsx';

export default function Cart() {
  const { cart, setCart, cartTotal, user, token } = useShop();
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const navigate = useNavigate();
  async function checkout(e) {
    e.preventDefault(); setError('');
    if (!user) return navigate('/login');
    try {
      const data = await api('/orders', { method: 'POST', token, body: { items: cart, address } });
      setDone(data.order); setCart([]);
    } catch (err) { setError(err.message); }
  }
  if (done) return <div className="form"><div className="success">Order placed! Order ID: {done._id}</div><p>Total: ₹{Math.round(done.total * 83).toLocaleString('en-IN')} · Status: {done.status}</p><Link className="btn" to="/orders">View my orders</Link></div>;
  return (
    <div>
      <h1>Your cart</h1>
      {error && <div className="error">{error}</div>}
      {cart.length === 0 ? <p>Your cart is empty. <Link to="/">Browse products →</Link></p> : (
        <>
          {cart.map((i) => (
            <div className="cart-row" key={i.product}>
              <img src={i.image} alt={i.name} />
              <div style={{ flex: 1 }}><strong>{i.name}</strong><div className="muted">₹{Math.round(i.price * 83).toLocaleString('en-IN')} each</div></div>
              <input type="number" min="1" value={i.qty} onChange={(e) => setCart(cart.map((x) => (x.product === i.product ? { ...x, qty: Number(e.target.value) } : x)))} style={{ width: 70, padding: 8, borderRadius: 8, border: '1px solid #d5dce3' }} />
              <button className="btn danger" onClick={() => setCart(cart.filter((x) => x.product !== i.product))}>Remove</button>
            </div>
          ))}
          <h3>Total: ₹{Math.round(cartTotal * 83).toLocaleString('en-IN')}</h3>
          <form className="form" style={{ maxWidth: '100%' }} onSubmit={checkout}>
            <div className="field"><label>Delivery address</label><textarea value={address} onChange={(e) => setAddress(e.target.value)} required rows="3" /></div>
            <button className="btn">Place order (mock payment)</button>
          </form>
        </>
      )}
    </div>
  );
}
