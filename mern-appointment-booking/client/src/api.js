const API = '/api';

function getToken() {
  return localStorage.getItem('medibook_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('medibook_token', token);
  else localStorage.removeItem('medibook_token');
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
  doctors: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/doctors${q ? `?${q}` : ''}`, { auth: false });
  },
  specialities: () => request('/doctors/specialities', { auth: false }),
  doctor: (id) => request(`/doctors/${id}`, { auth: false }),
  doctorSlots: (id, date) => request(`/doctors/${id}/slots?date=${date}`, { auth: false }),
  doctorDays: (id) => request(`/doctors/${id}/days`, { auth: false }),
  doctorDay: (date) => request(`/doctors/me/day?date=${date}`),
  updateSchedule: (payload) => request('/doctors/me/schedule', { method: 'PATCH', body: payload }),
  book: (payload) => request('/appointments', { method: 'POST', body: payload }),
  myAppointments: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/appointments/mine${q ? `?${q}` : ''}`);
  },
  appointment: (id) => request(`/appointments/${id}`),
  cancelAppointment: (id) => request(`/appointments/${id}/cancel`, { method: 'PATCH' }),
  reschedule: (id, payload) => request(`/appointments/${id}/reschedule`, { method: 'PATCH', body: payload }),
  confirmAppointment: (id) => request(`/appointments/${id}/confirm`, { method: 'PATCH' }),
  completeAppointment: (id, payload) => request(`/appointments/${id}/complete`, { method: 'PATCH', body: payload }),
  noShow: (id) => request(`/appointments/${id}/no-show`, { method: 'PATCH' }),
  joinWaitlist: (payload) => request('/waitlist', { method: 'POST', body: payload }),
  myWaitlist: () => request('/waitlist/mine'),
  doctorWaitlist: () => request('/waitlist/for-doctor'),
  leaveWaitlist: (id) => request(`/waitlist/${id}/leave`, { method: 'PATCH' }),
  adminOverview: () => request('/admin/overview'),
  notifications: () => request('/notifications'),
  readNotifications: () => request('/notifications/read-all', { method: 'PATCH' }),
};

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}
