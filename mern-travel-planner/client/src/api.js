const API = '/api';

function getToken() {
  return localStorage.getItem('voyara_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('voyara_token', token);
  else localStorage.removeItem('voyara_token');
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
  trips: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/trips${q ? `?${q}` : ''}`);
  },
  trip: (id) => request(`/trips/${id}`),
  createTrip: (payload) => request('/trips', { method: 'POST', body: payload }),
  updateTrip: (id, payload) => request(`/trips/${id}`, { method: 'PATCH', body: payload }),
  deleteTrip: (id) => request(`/trips/${id}`, { method: 'DELETE' }),
  invite: (id, payload) => request(`/trips/${id}/invite`, { method: 'POST', body: payload }),
  analytics: (id) => request(`/trips/${id}/analytics`),
  addActivity: (tripId, payload) => request(`/trips/${tripId}/activities`, { method: 'POST', body: payload }),
  updateActivity: (tripId, id, payload) =>
    request(`/trips/${tripId}/activities/${id}`, { method: 'PATCH', body: payload }),
  reorderActivities: (tripId, payload) =>
    request(`/trips/${tripId}/activities/reorder`, { method: 'POST', body: payload }),
  deleteActivity: (tripId, id) => request(`/trips/${tripId}/activities/${id}`, { method: 'DELETE' }),
  addExpense: (tripId, payload) => request(`/trips/${tripId}/expenses`, { method: 'POST', body: payload }),
  deleteExpense: (tripId, id) => request(`/trips/${tripId}/expenses/${id}`, { method: 'DELETE' }),
  addPacking: (tripId, payload) => request(`/trips/${tripId}/packing`, { method: 'POST', body: payload }),
  packingTemplate: (tripId) => request(`/trips/${tripId}/packing/template`, { method: 'POST' }),
  updatePacking: (tripId, id, payload) =>
    request(`/trips/${tripId}/packing/${id}`, { method: 'PATCH', body: payload }),
  deletePacking: (tripId, id) => request(`/trips/${tripId}/packing/${id}`, { method: 'DELETE' }),
};

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export const ACTIVITY_CATEGORIES = ['sightseeing', 'food', 'transport', 'stay', 'other'];
export const EXPENSE_CATEGORIES = ['stay', 'food', 'transport', 'sightseeing', 'shopping', 'other'];
export const PACKING_CATEGORIES = ['documents', 'clothing', 'toiletries', 'tech', 'health', 'other'];
export const TRIP_STATUSES = ['planning', 'upcoming', 'ongoing', 'completed'];
export const COVER_STYLES = ['heritage', 'mountain', 'coast', 'city', 'forest'];
