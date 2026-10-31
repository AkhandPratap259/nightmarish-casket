import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ShopContext = createContext(null);
export const useShop = () => useContext(ShopContext);
export const API = (path) => `/api${path}`;

export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(API(path), {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export function ShopProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shopkart_user') || 'null'); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('shopkart_token') || '');
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shopkart_cart') || '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem('shopkart_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    if (user) localStorage.setItem('shopkart_user', JSON.stringify(user)); else localStorage.removeItem('shopkart_user');
    if (token) localStorage.setItem('shopkart_token', token); else localStorage.removeItem('shopkart_token');
  }, [user, token]);

  const login = (data) => { setUser(data.user); setToken(data.token); };
  const logout = () => { setUser(null); setToken(''); };
  const addToCart = (product, qty = 1) => setCart((c) => {
    const found = c.find((i) => i.product === product._id);
    if (found) return c.map((i) => (i.product === product._id ? { ...i, qty: i.qty + qty } : i));
    return [...c, { product: product._id, name: product.name, price: product.price, image: product.image, qty }];
  });
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const value = useMemo(() => ({ user, token, login, logout, cart, setCart, addToCart, cartCount, cartTotal }),
    [user, token, cart, cartCount, cartTotal]);
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}
