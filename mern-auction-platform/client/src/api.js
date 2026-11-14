const API = '/api';

function getToken() {
  return localStorage.getItem('bidsphere_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('bidsphere_token', token);
  else localStorage.removeItem('bidsphere_token');
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('bidsphere_user') || 'null');
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('bidsphere_user', JSON.stringify(user));
  else localStorage.removeItem('bidsphere_user');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  health: () => request('/health', { auth: false }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),
  auctions: (params = {}) => {
    // URLSearchParams stringifies undefined as the literal "undefined",
    // which the server would then search for — drop empty values first.
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    const q = new URLSearchParams(clean).toString();
    return request(`/auctions${q ? `?${q}` : ''}`);
  },
  auction: (id) => request(`/auctions/${id}`),
  auctionBids: (id) => request(`/auctions/${id}/bids`),
  createAuction: (payload) => request('/auctions', { method: 'POST', body: payload }),
  cancelAuction: (id) => request(`/auctions/${id}`, { method: 'DELETE' }),
  myListings: () => request('/auctions/mine'),
  placeBid: (id, amount) => request(`/auctions/${id}/bids`, { method: 'POST', body: { amount } }),
  myBids: () => request('/bids/mine'),
  watchlist: () => request('/watchlist'),
  addWatch: (id) => request(`/watchlist/${id}`, { method: 'POST' }),
  removeWatch: (id) => request(`/watchlist/${id}`, { method: 'DELETE' }),
  adminOverview: () => request('/admin/overview'),
};

export function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export function inrShort(n) {
  const v = Number(n || 0);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
  return inr(v);
}

// Human countdown: "1h 24m 10s" / "42m 05s" / "12s". Returns null once past.
export function timeLeft(endsAt, now = Date.now()) {
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const CATEGORIES = ['watches', 'art', 'collectibles', 'tech', 'sneakers', 'memorabilia', 'vintage', 'home'];
export const CATEGORY_LABELS = {
  watches: 'Watches',
  art: 'Art',
  collectibles: 'Collectibles',
  tech: 'Tech',
  sneakers: 'Sneakers',
  memorabilia: 'Memorabilia',
  vintage: 'Vintage',
  home: 'Home',
};
export const CONDITION_LABELS = {
  new: 'New',
  'like-new': 'Like new',
  used: 'Used',
  vintage: 'Vintage',
};
