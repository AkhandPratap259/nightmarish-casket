const API = '/api';

function getToken() {
  return localStorage.getItem('lingualeap_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('lingualeap_token', token);
  else localStorage.removeItem('lingualeap_token');
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('lingualeap_user') || 'null');
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('lingualeap_user', JSON.stringify(user));
  else localStorage.removeItem('lingualeap_user');
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

// URLSearchParams stringifies undefined as the literal "undefined" —
// drop empty values first so the server never searches for them.
function withQuery(path, params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const q = new URLSearchParams(clean).toString();
  return q ? `${path}?${q}` : path;
}

export const api = {
  health: () => request('/health', { auth: false }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),
  languages: () => request('/languages'),
  language: (code) => request(`/languages/${code}`),
  lessons: (params = {}) => request(withQuery('/lessons', params)),
  lesson: (id) => request(`/lessons/${id}`),
  createLesson: (payload) => request('/lessons', { method: 'POST', body: payload }),
  updateLesson: (id, payload) => request(`/lessons/${id}`, { method: 'PUT', body: payload }),
  deleteLesson: (id) => request(`/lessons/${id}`, { method: 'DELETE' }),
  startLesson: (id) => request(`/learn/start/${id}`, { method: 'POST' }),
  submitAnswer: (lessonId, exerciseIndex, answer) =>
    request('/learn/answer', { method: 'POST', body: { lessonId, exerciseIndex, answer } }),
  completeLesson: (lessonId) => request('/learn/complete', { method: 'POST', body: { lessonId } }),
  reviewDue: () => request('/review'),
  reviewAnswer: (itemId, correct) => request('/review/answer', { method: 'POST', body: { itemId, correct } }),
  reviewAdd: (payload) => request('/review/add', { method: 'POST', body: payload }),
  leaderboardWeekly: () => request('/leaderboard/weekly'),
  leaderboardAllTime: () => request('/leaderboard/all-time'),
  myWeek: () => request('/leaderboard/my-week'),
  adminOverview: () => request('/admin/overview'),
};

// Level curve, mirroring the server: level n needs 50 * (n - 1) * n XP.
export function xpForLevel(level) {
  return 50 * (level - 1) * level;
}

export function levelForXp(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level += 1;
  return level;
}

export function xpIntoLevel(xp) {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - base, needed: next - base };
}
