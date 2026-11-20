const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('fairshare_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('fairshare_token', token);
  else localStorage.removeItem('fairshare_token');
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('fairshare_user') || 'null');
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('fairshare_user', JSON.stringify(user));
  else localStorage.removeItem('fairshare_user');
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
    const message = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Responses may be a bare array or wrapped in an object; normalise to an array.
export function asArray(data, key) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[key])) return data[key];
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

export const api = {
  health: () => request('/health'),
  register: (body) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  listGroups: () => request('/groups'),
  createGroup: (body) =>
    request('/groups', { method: 'POST', body: JSON.stringify(body) }),
  getGroup: (id) => request(`/groups/${id}`),
  addMember: (groupId, body) =>
    request(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(body) }),
  removeMember: (groupId, userId) =>
    request(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
  listExpenses: (groupId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/groups/${groupId}/expenses${qs ? `?${qs}` : ''}`);
  },
  createExpense: (groupId, body) =>
    request(`/groups/${groupId}/expenses`, { method: 'POST', body: JSON.stringify(body) }),
  deleteExpense: (groupId, expenseId) =>
    request(`/groups/${groupId}/expenses/${expenseId}`, { method: 'DELETE' }),
  getBalances: (groupId) => request(`/groups/${groupId}/balances`),
  recordSettlement: (groupId, body) =>
    request(`/groups/${groupId}/settlements`, { method: 'POST', body: JSON.stringify(body) }),
  listSettlements: (groupId) => request(`/groups/${groupId}/settlements`),
  getActivity: (groupId) => request(`/groups/${groupId}/activity`),
  getAnalytics: (groupId) => request(`/groups/${groupId}/analytics`),
  getDashboard: () => request('/dashboard'),
  adminOverview: () => request('/admin/overview'),
};

export function formatMoney(value, currency = 'INR') {
  const n = Number(value) || 0;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `₹${n.toLocaleString('en-IN')}`;
  }
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function memberName(member) {
  if (!member) return 'Unknown';
  if (typeof member === 'string') return member;
  return member.name || member.email || 'Unknown';
}

export function memberId(member) {
  if (!member) return '';
  if (typeof member === 'string') return member;
  return member._id || member.id || member.userId || member.user || '';
}

export function userIdOf(user) {
  if (!user) return '';
  if (typeof user === 'string') return user;
  return user._id || user.id || user.userId || '';
}
