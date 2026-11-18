const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('pulsefit_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('pulsefit_token', token);
  else localStorage.removeItem('pulsefit_token');
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('pulsefit_user') || 'null');
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('pulsefit_user', JSON.stringify(user));
  else localStorage.removeItem('pulsefit_user');
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
  listExercises: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/exercises${qs ? `?${qs}` : ''}`);
  },
  getExercise: (id) => request(`/exercises/${id}`),
  createExercise: (body) =>
    request('/exercises', { method: 'POST', body: JSON.stringify(body) }),
  deleteExercise: (id) => request(`/exercises/${id}`, { method: 'DELETE' }),
  listTemplates: (mine = false) => request(`/templates${mine ? '?mine=true' : ''}`),
  getTemplate: (id) => request(`/templates/${id}`),
  createTemplate: (body) =>
    request('/templates', { method: 'POST', body: JSON.stringify(body) }),
  updateTemplate: (id, body) =>
    request(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  reorderTemplate: (id, itemIds) =>
    request(`/templates/${id}/order`, {
      method: 'PUT',
      body: JSON.stringify({ itemIds }),
    }),
  duplicateTemplate: (id) => request(`/templates/${id}/duplicate`, { method: 'POST' }),
  deleteTemplate: (id) => request(`/templates/${id}`, { method: 'DELETE' }),
  startSession: (body) =>
    request('/sessions', { method: 'POST', body: JSON.stringify(body) }),
  mySessions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/sessions/mine${qs ? `?${qs}` : ''}`);
  },
  getSession: (id) => request(`/sessions/${id}`),
  logSet: (id, body) =>
    request(`/sessions/${id}/sets`, { method: 'POST', body: JSON.stringify(body) }),
  deleteSet: (id, body) =>
    request(`/sessions/${id}/sets`, { method: 'DELETE', body: JSON.stringify(body) }),
  addExerciseToSession: (id, body) =>
    request(`/sessions/${id}/exercises`, { method: 'POST', body: JSON.stringify(body) }),
  finishSession: (id) => request(`/sessions/${id}/finish`, { method: 'POST' }),
  deleteSession: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),
  myRecords: () => request('/records/mine'),
  suggestions: () => request('/records/suggestions'),
  analytics: () => request('/analytics/overview'),
  listChallenges: (all = false) => request(`/challenges${all ? '?all=true' : ''}`),
  createChallenge: (body) =>
    request('/challenges', { method: 'POST', body: JSON.stringify(body) }),
  joinChallenge: (id) => request(`/challenges/${id}/join`, { method: 'POST' }),
  challengeLeaderboard: (id) => request(`/challenges/${id}/leaderboard`),
  myPlans: () => request('/plans/mine'),
  createPlan: (body) => request('/plans', { method: 'POST', body: JSON.stringify(body) }),
  assignPlan: (id, userId) =>
    request(`/plans/${id}/assign`, { method: 'POST', body: JSON.stringify({ userId }) }),
  getPlan: (id) => request(`/plans/${id}`),
  adminOverview: () => request('/admin/overview'),
};

export function formatKg(value) {
  const n = Number(value) || 0;
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg`;
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m ${String(rest).padStart(2, '0')}s`;
}
