const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('playpulse_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('playpulse_token', token);
  else localStorage.removeItem('playpulse_token');
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('playpulse_user') || 'null');
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('playpulse_user', JSON.stringify(user));
  else localStorage.removeItem('playpulse_user');
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

export function asArray(data, key) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[key])) return data[key];
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

export const api = {
  health: () => request('/health'),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  listLeagues: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/leagues${qs ? `?${qs}` : ''}`);
  },
  getLeague: (id) => request(`/leagues/${id}`),
  createLeague: (body) => request('/leagues', { method: 'POST', body: JSON.stringify(body) }),
  updateLeague: (id, body) => request(`/leagues/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteLeague: (id) => request(`/leagues/${id}`, { method: 'DELETE' }),
  generateFixtures: (id, body = {}) => request(`/leagues/${id}/generate-fixtures`, { method: 'POST', body: JSON.stringify(body) }),
  getStandings: (id) => request(`/leagues/${id}/standings`),
  getAnalytics: (id) => request(`/leagues/${id}/analytics`),
  listTeams: (leagueId) => request(`/teams/leagues/${leagueId}/teams`),
  createTeam: (leagueId, body) => request(`/teams/leagues/${leagueId}/teams`, { method: 'POST', body: JSON.stringify(body) }),
  updateTeam: (id, body) => request(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTeam: (id) => request(`/teams/${id}`, { method: 'DELETE' }),
  listMatches: (leagueId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/matches/leagues/${leagueId}/matches${qs ? `?${qs}` : ''}`);
  },
  listLiveMatches: () => request('/matches/live'),
  getMatch: (id) => request(`/matches/${id}`),
  startMatch: (id) => request(`/matches/${id}/start`, { method: 'POST' }),
  finishMatch: (id) => request(`/matches/${id}/finish`, { method: 'POST' }),
  addEvent: (id, body) => request(`/matches/${id}/events`, { method: 'POST', body: JSON.stringify(body) }),
  deleteEvent: (matchId, eventId) => request(`/matches/${matchId}/events/${eventId}`, { method: 'DELETE' }),
  adminOverview: () => request('/admin/overview'),
  adminUsers: () => request('/admin/users'),
  adminSetUserActive: (id, active) => request(`/admin/users/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active }) }),
};
