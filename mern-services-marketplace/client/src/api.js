const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('tasktrove_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('tasktrove_token', token);
  else localStorage.removeItem('tasktrove_token');
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('tasktrove_user') || 'null');
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('tasktrove_user', JSON.stringify(user));
  else localStorage.removeItem('tasktrove_user');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  health: () => request('/health'),
  register: (body) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  listServices: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/services${qs ? `?${qs}` : ''}`);
  },
  listOfferings: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/offerings${qs ? `?${qs}` : ''}`);
  },
  getOffering: (id, area) =>
    request(`/offerings/${id}${area ? `?area=${encodeURIComponent(area)}` : ''}`),
  myOfferings: () => request('/offerings/mine'),
  createOffering: (body) =>
    request('/offerings', { method: 'POST', body: JSON.stringify(body) }),
  updateOffering: (id, body) =>
    request(`/offerings/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteOffering: (id) => request(`/offerings/${id}`, { method: 'DELETE' }),
  listProviders: () => request('/providers'),
  getProvider: (id) => request(`/providers/${id}`),
  slots: (offeringId, date) =>
    request(`/bookings/slots?offeringId=${offeringId}&date=${date}`),
  createBooking: (body) =>
    request('/bookings', { method: 'POST', body: JSON.stringify(body) }),
  myBookings: (status) =>
    request(`/bookings/mine${status ? `?status=${status}` : ''}`),
  getBooking: (id) => request(`/bookings/${id}`),
  updateBookingStatus: (id, status) =>
    request(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  createReview: (body) =>
    request('/reviews', { method: 'POST', body: JSON.stringify(body) }),
  providerReviews: (providerId) => request(`/reviews/provider/${providerId}`),
  offeringReviews: (offeringId) => request(`/reviews/offering/${offeringId}`),
  providerAnalytics: () => request('/analytics/provider'),
  adminOverview: () => request('/analytics/overview'),
  adminUsers: () => request('/admin/users'),
  adminBookings: () => request('/admin/bookings'),
  setUserActive: (id, active) =>
    request(`/admin/users/${id}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }),
  setOfferingActive: (id, active) =>
    request(`/admin/offerings/${id}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }),
};

export function formatINR(value) {
  const n = Number(value) || 0;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
