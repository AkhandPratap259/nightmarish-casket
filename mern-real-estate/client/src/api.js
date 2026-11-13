const API = '/api';

function getToken() {
  return localStorage.getItem('nesthunt_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('nesthunt_token', token);
  else localStorage.removeItem('nesthunt_token');
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
  properties: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/properties${q ? `?${q}` : ''}`);
  },
  property: (id) => request(`/properties/${id}`),
  createProperty: (payload) => request('/properties', { method: 'POST', body: payload }),
  updateProperty: (id, payload) => request(`/properties/${id}`, { method: 'PUT', body: payload }),
  deleteProperty: (id) => request(`/properties/${id}`, { method: 'DELETE' }),
  favourites: () => request('/favourites'),
  addFavourite: (id) => request(`/favourites/${id}`, { method: 'POST' }),
  removeFavourite: (id) => request(`/favourites/${id}`, { method: 'DELETE' }),
  compare: (ids) => request(`/compare?ids=${ids.join(',')}`),
  emi: (payload) => request('/calculator/emi', { method: 'POST', body: payload }),
  priceAnalytics: () => request('/analytics/prices'),
  savedSearches: () => request('/saved-searches'),
  createSavedSearch: (payload) => request('/saved-searches', { method: 'POST', body: payload }),
  deleteSavedSearch: (id) => request(`/saved-searches/${id}`, { method: 'DELETE' }),
  enquire: (id, payload) => request(`/properties/${id}/enquiries`, { method: 'POST', body: payload }),
  enquiries: () => request('/enquiries'),
  replyEnquiry: (id, payload) => request(`/enquiries/${id}/reply`, { method: 'POST', body: payload }),
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

export function emiLocal(principal, annualRate, years) {
  const months = Math.round(years * 12);
  const r = annualRate / 1200;
  let emi;
  if (r === 0) emi = principal / months;
  else emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  return Math.round(emi);
}

export const PROPERTY_TYPES = ['apartment', 'house', 'villa', 'plot', 'commercial'];
export const PROPERTY_STATUSES = ['available', 'under-offer', 'sold'];
export const AMENITY_OPTIONS = ['Parking', 'Lift', 'Power backup', 'Gym', 'Swimming pool', 'Garden', 'Gated security', 'Modular kitchen'];
