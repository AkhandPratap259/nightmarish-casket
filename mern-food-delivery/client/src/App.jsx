import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const API = '/api';
const FLOW = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
const FLOW_LABEL = { placed: 'Order placed', confirmed: 'Confirmed', preparing: 'Being prepared', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled' };

async function api(path, method = 'GET', body, token) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Reveal-on-scroll: dishes and restaurant cards fade/slide in as they enter view.
function useReveal(deps) {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.revealed)');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, deps);
}

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('ff_user') || 'null'));
  const token = user?.token || '';
  const [view, setView] = useState('home');
  const [restaurants, setRestaurants] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [q, setQ] = useState('');
  const [cuisine, setCuisine] = useState('All');
  const [vegOnly, setVegOnly] = useState(false);
  const [sort, setSort] = useState('');
  const [detail, setDetail] = useState(null);
  const [menuVeg, setMenuVeg] = useState(false);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('ff_cart') || '[]'));
  const [cartOpen, setCartOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [tracking, setTracking] = useState(null);
  const [toast, setToast] = useState('');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', role: 'customer', mode: 'login' });
  const [checkout, setCheckout] = useState({ address: '', paymentMethod: 'cod', promoCode: '' });
  const [newDish, setNewDish] = useState({ name: '', price: '', category: 'Main', veg: true, description: '' });
  useReveal([restaurants, detail, view]);

  useEffect(() => { localStorage.setItem('ff_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('ff_user', JSON.stringify(user)); }, [user]);

  const loadHome = () => {
    const params = new URLSearchParams({ q, cuisine, veg: vegOnly, sort });
    api(`/restaurants?${params}`).then(setRestaurants).catch(() => {});
    api('/restaurants/cuisines').then(setCuisines).catch(() => {});
  };
  useEffect(loadHome, [q, cuisine, vegOnly, sort]);

  const loadOrders = () => token && api('/orders/mine', 'GET', null, token).then(setOrders).catch(() => {});
  useEffect(() => { if (view === 'orders' || view === 'owner') loadOrders(); }, [view]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2600); };

  const cartRestaurant = cart.length ? cart[0].restaurantId : null;
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  function addToCart(dish, restaurantId) {
    if (cartRestaurant && cartRestaurant !== restaurantId) {
      if (!confirm('Your cart has items from another restaurant. Replace the cart?')) return;
      setCart([{ ...dish, itemId: dish._id, restaurantId, qty: 1 }]);
    } else {
      setCart((c) => {
        const found = c.find((i) => i.itemId === dish._id);
        if (found) return c.map((i) => (i.itemId === dish._id ? { ...i, qty: Math.min(20, i.qty + 1) } : i));
        return [...c, { itemId: dish._id, name: dish.name, price: dish.price, restaurantId, qty: 1 }];
      });
    }
    showToast(`${dish.name} added to cart`);
  }
  const changeQty = (id, d) => setCart((c) => c.map((i) => (i.itemId === id ? { ...i, qty: i.qty + d } : i)).filter((i) => i.qty > 0));

  async function openRestaurant(id) {
    const data = await api(`/restaurants/${id}`);
    setDetail(data);
    setView('restaurant');
  }

  async function placeOrder() {
    if (!token) { setView('auth'); showToast('Please log in first'); return; }
    try {
      const order = await api('/orders', 'POST', {
        restaurantId: cartRestaurant, items: cart, promoCode: checkout.promoCode,
        paymentMethod: checkout.paymentMethod, deliveryAddress: checkout.address,
      }, token);
      setCart([]); setCartOpen(false); setTracking(order); setView('track');
      showToast('Order placed! Tracking live.');
    } catch (e) { showToast(e.message); }
  }

  async function openTrack(order) {
    const full = await api(`/orders/${order._id}`, 'GET', null, token).catch(() => order);
    setTracking(full); setView('track');
  }

  // Live tracking: join the order's Socket.io room; the server pushes every status change.
  useEffect(() => {
    if (!tracking || view !== 'track') return;
    const socket = io('/', { path: '/socket.io' });
    socket.emit('join-order', tracking._id);
    socket.on('order:updated', (o) => setTracking(o));
    return () => socket.disconnect();
  }, [tracking?._id, view]);

  async function doAuth(e) {
    e.preventDefault();
    try {
      const data = await api(`/auth/${authForm.mode}`, 'POST', authForm);
      setUser({ ...data.user, token: data.token });
      setView('home'); showToast(`Welcome, ${data.user.name}`);
    } catch (err) { showToast(err.message); }
  }

  const ownerOrders = useMemo(() => orders, [orders]);
  const revenue = ownerOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);

  const trackStep = tracking ? FLOW.indexOf(tracking.status) : -1;
  const progress = tracking?.status === 'cancelled' ? 0 : trackStep < 0 ? 0 : (trackStep / (FLOW.length - 1)) * 100;

  return (
    <div className="app">
      <header className="topbar">
        <button className="logo" onClick={() => setView('home')}>🍔 FoodFleet</button>
        <nav>
          <button onClick={() => setView('home')}>Restaurants</button>
          <button onClick={() => { setView('orders'); loadOrders(); }}>My Orders</button>
          {user?.role === 'restaurant' && <button onClick={() => setView('owner')}>Owner Dashboard</button>}
          {user ? (
            <><span className="who">Hi, {user.name}</span><button onClick={() => { setUser(null); localStorage.removeItem('ff_user'); }}>Log out</button></>
          ) : (
            <button className="primary" onClick={() => setView('auth')}>Log in</button>
          )}
          <button className="cart-btn" onClick={() => setCartOpen(true)}>🛒 Cart {cartCount > 0 && <b>{cartCount}</b>}</button>
        </nav>
      </header>

      {toast && <div className="toast">{toast}</div>}

      {view === 'home' && (
        <main>
          <section className="hero">
            <div>
              <h1>Good food, <em>still hot</em> at your door.</h1>
              <p>Six kitchens, one cart, live tracking from the tawa to your table. Prices in ₹, GST included at checkout.</p>
              <div className="searchbar">
                <input placeholder="Search restaurants — try “dosa” or “pizza”" value={q} onChange={(e) => setQ(e.target.value)} />
                <label><input type="checkbox" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} /> Veg only</label>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="">Recommended</option><option value="rating">Top rated</option><option value="fastest">Fastest</option>
                </select>
              </div>
              <div className="chips">
                {['All', ...cuisines].map((c) => (
                  <button key={c} className={cuisine === c ? 'chip active' : 'chip'} onClick={() => setCuisine(c)}>{c}</button>
                ))}
              </div>
            </div>
            <div className="hero-art" aria-hidden>🍛<span>🥡</span><span>🍕</span><span>🍨</span></div>
          </section>

          <p className="promo-strip">Promo codes: <b>WELCOME20</b> = 20% off (up to ₹150) · <b>FLAT50</b> = ₹50 off over ₹299 · <b>FREEDEL</b> = free delivery · Free delivery over ₹499</p>

          <section className="grid">
            {restaurants.map((r) => (
              <article key={r._id} className="rest-card reveal tilt" onClick={() => openRestaurant(r._id)}>
                <div className="rest-emoji">{r.emoji}</div>
                <h3>{r.name}</h3>
                <p className="muted">{r.cuisine} · {r.area}</p>
                <p>{r.description}</p>
                <div className="meta"><span>⭐ {r.rating.toFixed(1)}</span><span>⏱ {r.deliveryMinutes} min</span><span>{r.priceLevel}</span><span className={r.isOpen ? 'open' : 'closed'}>{r.isOpen ? 'Open now' : 'Closed'}</span></div>
              </article>
            ))}
            {restaurants.length === 0 && <p className="muted">No restaurants match that search yet.</p>}
          </section>
        </main>
      )}

      {view === 'restaurant' && detail && (
        <main>
          <button className="link" onClick={() => setView('home')}>← All restaurants</button>
          <section className="rest-hero">
            <div className="rest-emoji big">{detail.restaurant.emoji}</div>
            <div>
              <h2>{detail.restaurant.name}</h2>
              <p className="muted">{detail.restaurant.cuisine} · {detail.restaurant.area} · ⭐ {detail.restaurant.rating.toFixed(1)} · ⏱ {detail.restaurant.deliveryMinutes} min · {detail.restaurant.priceLevel}</p>
              <p>{detail.restaurant.description}</p>
              <label><input type="checkbox" checked={menuVeg} onChange={(e) => setMenuVeg(e.target.checked)} /> Veg only</label>
            </div>
          </section>
          <section className="menu">
            {detail.menu.filter((d) => !menuVeg || d.veg).map((d) => {
              const inCart = cart.find((i) => i.itemId === d._id);
              return (
                <article key={d._id} className={`dish reveal tilt ${!d.available ? 'dim' : ''}`}>
                  <span className="dish-emoji">{d.emoji}</span>
                  <div className="dish-info">
                    <h4>{d.name} {d.veg ? <span className="veg-dot" title="Veg">🟢</span> : <span className="veg-dot" title="Non-veg">🔴</span>} {d.popular && <span className="badge">Bestseller</span>} {'🌶'.repeat(d.spicy)}</h4>
                    <p className="muted">{d.description}</p>
                    <p className="price">₹{d.price} · {d.category}</p>
                  </div>
                  {inCart ? (
                    <div className="stepper"><button onClick={() => changeQty(d._id, -1)}>−</button><b>{inCart.qty}</b><button onClick={() => changeQty(d._id, 1)}>+</button></div>
                  ) : (
                    <button className="primary" disabled={!d.available} onClick={() => addToCart(d, detail.restaurant._id)}>{d.available ? 'Add +' : 'Sold out'}</button>
                  )}
                </article>
              );
            })}
          </section>
        </main>
      )}

      {view === 'orders' && (
        <main>
          <h2>My Orders</h2>
          {!token && <p className="muted">Log in to see your orders. Demo customer: demo@foodfleet.example / FoodFleet123!</p>}
          <section className="order-list">
            {orders.map((o) => (
              <article key={o._id} className="order-card reveal" onClick={() => openTrack(o)}>
                <div><b>{o.restaurant?.name || 'Restaurant'}</b><p className="muted">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</p></div>
                <div className="right"><b>₹{o.total}</b><span className={`status ${o.status}`}>{FLOW_LABEL[o.status]}</span></div>
              </article>
            ))}
            {token && orders.length === 0 && <p className="muted">No orders yet — order something tasty first.</p>}
          </section>
        </main>
      )}

      {view === 'track' && tracking && (
        <main className="track-page">
          <h2>Tracking your order</h2>
          <p className="muted">{tracking.restaurant?.name || ''} · Courier: {tracking.courierName} · ETA: {tracking.status === 'delivered' ? 'Delivered' : `${tracking.etaMinutes} min`}</p>
          <div className="route" aria-hidden>
            <div className="route-line"><div className="route-fill" style={{ width: `${progress}%` }} /></div>
            <div className="courier" style={{ left: `${progress}%` }}>🛵</div>
            <span className="route-end">🏠</span>
          </div>
          <ol className="timeline">
            {FLOW.map((s, i) => (
              <li key={s} className={trackStep >= i && tracking.status !== 'cancelled' ? 'done' : ''}>
                <span className="dot" />{FLOW_LABEL[s]}
                {tracking.statusHistory?.find((h) => h.status === s) && <small> {new Date(tracking.statusHistory.find((h) => h.status === s).at).toLocaleTimeString()}</small>}
              </li>
            ))}
          </ol>
          {tracking.status === 'cancelled' && <p className="alert">This order was cancelled.</p>}
          <p className="bill">Items ₹{tracking.subtotal} − discount ₹{tracking.discount} + delivery ₹{tracking.deliveryFee} + GST ₹{tracking.gst} = <b>₹{tracking.total}</b> ({tracking.paymentMethod === 'cod' ? 'Cash on delivery' : 'Mock online payment — no real money moves'})</p>
          <div className="actions">
            {['placed', 'confirmed', 'preparing', 'out_for_delivery'].includes(tracking.status) && (
              <button className="primary" onClick={async () => { await api(`/orders/${tracking._id}/simulate`, 'POST', {}, token); showToast('Live simulation started — status advances every 12 seconds'); }}>▶ Simulate live delivery</button>
            )}
            {['placed', 'confirmed'].includes(tracking.status) && (
              <button onClick={async () => { const o = await api(`/orders/${tracking._id}/cancel`, 'POST', {}, token); setTracking(o); showToast('Order cancelled'); }}>Cancel order</button>
            )}
            <button onClick={() => { setView('orders'); loadOrders(); }}>Back to orders</button>
          </div>
        </main>
      )}

      {view === 'owner' && (
        <main>
          <h2>Owner Dashboard</h2>
          <div className="stats">
            <div className="stat"><b>{ownerOrders.length}</b><span>Orders</span></div>
            <div className="stat"><b>₹{revenue}</b><span>Revenue (excl. cancelled)</span></div>
            <div className="stat"><b>{ownerOrders.filter((o) => o.status === 'delivered').length}</b><span>Delivered</span></div>
          </div>
          <section className="order-list">
            {ownerOrders.map((o) => (
              <article key={o._id} className="order-card reveal">
                <div><b>{o.restaurant?.name}</b><p className="muted">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')} · ₹{o.total}</p></div>
                <div className="actions">
                  <span className={`status ${o.status}`}>{FLOW_LABEL[o.status]}</span>
                  {FLOW.includes(o.status) && o.status !== 'delivered' && (
                    <button className="primary" onClick={async () => { const upd = await api(`/orders/${o._id}/advance`, 'POST', {}, token); setOrders((os) => os.map((x) => (x._id === upd._id ? upd : x))); }}>Advance →</button>
                  )}
                </div>
              </article>
            ))}
            {ownerOrders.length === 0 && <p className="muted">No orders for your restaurants yet. Demo owner: demo-owner@foodfleet.example / FoodFleet123!</p>}
          </section>
          <h3>Add a dish to your first restaurant</h3>
          <form className="dish-form" onSubmit={async (e) => {
            e.preventDefault();
            const mine = await api('/restaurants', 'GET', null, token).catch(() => []);
            const first = Array.isArray(mine) ? mine[0] : null;
            if (!first) { showToast('Create a restaurant first (see README)'); return; }
            await api(`/restaurants/${first._id}/menu`, 'POST', { ...newDish, price: Number(newDish.price) }, token);
            showToast(`Added ${newDish.name} to ${first.name}`);
          }}>
            <input placeholder="Dish name" required value={newDish.name} onChange={(e) => setNewDish({ ...newDish, name: e.target.value })} />
            <input placeholder="Price ₹" type="number" required value={newDish.price} onChange={(e) => setNewDish({ ...newDish, price: e.target.value })} />
            <input placeholder="Category" value={newDish.category} onChange={(e) => setNewDish({ ...newDish, category: e.target.value })} />
            <input placeholder="Description" value={newDish.description} onChange={(e) => setNewDish({ ...newDish, description: e.target.value })} />
            <label><input type="checkbox" checked={newDish.veg} onChange={(e) => setNewDish({ ...newDish, veg: e.target.checked })} /> Veg</label>
            <button className="primary">Add dish</button>
          </form>
        </main>
      )}

      {view === 'auth' && (
        <main className="auth-page">
          <h2>{authForm.mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="muted">Demo customer: demo@foodfleet.example / FoodFleet123! · Demo owner: demo-owner@foodfleet.example / FoodFleet123!</p>
          <form onSubmit={doAuth} className="auth-form">
            {authForm.mode === 'register' && <input placeholder="Full name" required value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} />}
            <input placeholder="Email" type="email" required value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
            <input placeholder="Password" type="password" required value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
            {authForm.mode === 'register' && (
              <select value={authForm.role} onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}>
                <option value="customer">Customer — order food</option><option value="restaurant">Restaurant owner — manage a kitchen</option>
              </select>
            )}
            <button className="primary">{authForm.mode === 'login' ? 'Log in' : 'Register'}</button>
            <button type="button" className="link" onClick={() => setAuthForm({ ...authForm, mode: authForm.mode === 'login' ? 'register' : 'login' })}>
              {authForm.mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
            </button>
          </form>
        </main>
      )}

      {cartOpen && (
        <div className="drawer-backdrop" onClick={() => setCartOpen(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <h3>Your cart {cartCount > 0 && `(${cartCount} items)`}</h3>
            {cart.length === 0 && <p className="muted">Your cart is empty. Add a dish from any restaurant.</p>}
            {cart.map((i) => (
              <div key={i.itemId} className="cart-line">
                <span>{i.name}</span>
                <div className="stepper small"><button onClick={() => changeQty(i.itemId, -1)}>−</button><b>{i.qty}</b><button onClick={() => changeQty(i.itemId, 1)}>+</button></div>
                <b>₹{i.price * i.qty}</b>
              </div>
            ))}
            {cart.length > 0 && (
              <>
                <p className="muted">Subtotal ₹{cartSubtotal} · final bill (discounts, delivery fee, GST) is computed by the server at checkout.</p>
                <input placeholder="Delivery address" value={checkout.address} onChange={(e) => setCheckout({ ...checkout, address: e.target.value })} />
                <input placeholder="Promo code (try WELCOME20)" value={checkout.promoCode} onChange={(e) => setCheckout({ ...checkout, promoCode: e.target.value })} />
                <div className="pay-row">
                  {['cod', 'mock_upi', 'mock_card'].map((m) => (
                    <label key={m}><input type="radio" checked={checkout.paymentMethod === m} onChange={() => setCheckout({ ...checkout, paymentMethod: m })} /> {m === 'cod' ? 'Cash on delivery' : m === 'mock_upi' ? 'Mock UPI' : 'Mock card'}</label>
                  ))}
                </div>
                <p className="muted small">Mock payments only — no real money moves.</p>
                <button className="primary wide" onClick={placeOrder}>Place order · ₹{cartSubtotal}+</button>
                <button className="link" onClick={() => { setCart([]); }}>Clear cart</button>
              </>
            )}
            <button className="close" onClick={() => setCartOpen(false)}>Close ✕</button>
          </aside>
        </div>
      )}

      <footer>FoodFleet · MERN demo project · mock payments only · free delivery over ₹499 · GST 5%</footer>
    </div>
  );
}
