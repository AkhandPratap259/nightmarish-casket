import React from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { useShop } from './context.jsx';
import Shop from './pages/Shop.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Auth from './pages/Auth.jsx';
import Cart from './pages/Cart.jsx';
import Orders from './pages/Orders.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  const { user, logout, cartCount } = useShop();
  const navigate = useNavigate();
  return (
    <div>
      <header>
        <div className="nav">
          <Link className="logo" to="/">Shop<span>Kart</span></Link>
          <nav>
            <Link to="/">Shop</Link>
            <Link to="/cart">Cart ({cartCount})</Link>
            {user && <Link to="/orders">My orders</Link>}
            {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
            {user ? (<><span className="muted" style={{ color: '#cbd5e1' }}>{user.name}</span><button onClick={() => { logout(); navigate('/'); }}>Log out</button></>)
              : (<><Link to="/login">Log in</Link><Link to="/register">Register</Link></>)}
          </nav>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  );
}
