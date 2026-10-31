import React, { useEffect, useState } from 'react';
import { api, useShop } from '../context.jsx';

export default function Orders() {
  const { token } = useShop();
  const [orders, setOrders] = useState([]);
  useEffect(() => { api('/orders/mine', { token }).then((d) => setOrders(d.orders)).catch(() => {}); }, [token]);
  return (
    <div>
      <h1>My orders</h1>
      {orders.length === 0 ? <p>No orders yet.</p> : (
        <table className="table"><thead><tr><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>{orders.map((o) => (
            <tr key={o._id}><td>{new Date(o.createdAt).toLocaleDateString()}</td><td>{o.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}</td><td>₹{(o.total * 83).toLocaleString('en-IN')}</td><td>{o.status}</td></tr>
          ))}</tbody></table>
      )}
    </div>
  );
}
