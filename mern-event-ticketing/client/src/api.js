const API = '/api';

function getToken() {
  return localStorage.getItem('gatherly_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('gatherly_token', token);
  else localStorage.removeItem('gatherly_token');
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
  events: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/events${q ? `?${q}` : ''}`, { auth: false });
  },
  event: (id) => request(`/events/${id}`, { auth: false }),
  eventSeats: (id) => request(`/events/${id}/seats`),
  eventBookings: (id) => request(`/events/${id}/bookings`),
  createEvent: (payload) => request('/events', { method: 'POST', body: payload }),
  updateEvent: (id, payload) => request(`/events/${id}`, { method: 'PATCH', body: payload }),
  holdSeats: (payload) => request('/bookings/hold', { method: 'POST', body: payload }),
  confirmBooking: (id, payload) => request(`/bookings/${id}/confirm`, { method: 'POST', body: payload }),
  myBookings: () => request('/bookings/mine'),
  cancelBooking: (id) => request(`/bookings/${id}/cancel`, { method: 'POST' }),
  checkin: (code) => request('/bookings/checkin', { method: 'POST', body: { code } }),
  joinWaitlist: (eventId) => request('/waitlist', { method: 'POST', body: { eventId } }),
  myWaitlist: () => request('/waitlist/mine'),
  organizerWaitlist: () => request('/waitlist/for-organizer'),
  leaveWaitlist: (id) => request(`/waitlist/${id}/leave`, { method: 'PATCH' }),
  organizerEvents: () => request('/organizer/events'),
  organizerAnalytics: () => request('/organizer/analytics'),
  organizerBookings: () => request('/organizer/bookings'),
  adminAnalytics: () => request('/admin/analytics'),
  notifications: () => request('/notifications'),
  readNotifications: () => request('/notifications/read-all', { method: 'PATCH' }),
};

export function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}
