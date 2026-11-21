const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('flavorforge_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('flavorforge_token', token);
  else localStorage.removeItem('flavorforge_token');
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('flavorforge_user') || 'null');
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('flavorforge_user', JSON.stringify(user));
  else localStorage.removeItem('flavorforge_user');
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
  stats: () => request('/stats'),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  listRecipes: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/recipes${qs ? `?${qs}` : ''}`);
  },
  getRecipe: (id, servings) => request(`/recipes/${id}${servings ? `?servings=${servings}` : ''}`),
  createRecipe: (body) => request('/recipes', { method: 'POST', body: JSON.stringify(body) }),
  updateRecipe: (id, body) => request(`/recipes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteRecipe: (id) => request(`/recipes/${id}`, { method: 'DELETE' }),
  markCooked: (id) => request(`/recipes/${id}/cooked`, { method: 'POST' }),
  reportRecipe: (id) => request(`/recipes/${id}/report`, { method: 'POST' }),
  hideRecipe: (id) => request(`/recipes/${id}/hide`, { method: 'POST' }),
  unhideRecipe: (id) => request(`/recipes/${id}/unhide`, { method: 'POST' }),
  listReviews: (id) => request(`/recipes/${id}/reviews`),
  addReview: (id, body) => request(`/recipes/${id}/reviews`, { method: 'POST', body: JSON.stringify(body) }),
  listCollections: () => request('/collections'),
  createCollection: (body) => request('/collections', { method: 'POST', body: JSON.stringify(body) }),
  deleteCollection: (id) => request(`/collections/${id}`, { method: 'DELETE' }),
  addToCollection: (id, recipeId) => request(`/collections/${id}/recipes`, { method: 'POST', body: JSON.stringify({ recipeId }) }),
  removeFromCollection: (id, recipeId) => request(`/collections/${id}/recipes/${recipeId}`, { method: 'DELETE' }),
  listPlan: (from, to) => request(`/planner?from=${from}&to=${to}`),
  addPlan: (body) => request('/planner', { method: 'POST', body: JSON.stringify(body) }),
  movePlan: (id, body) => request(`/planner/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  removePlan: (id) => request(`/planner/${id}`, { method: 'DELETE' }),
  getGrocery: (from, to) => request(`/planner/grocery?from=${from}&to=${to}`),
  toggleGrocery: (id, checked) => request(`/planner/grocery/${id}`, { method: 'PATCH', body: JSON.stringify({ checked }) }),
  clearCheckedGrocery: (weekStart) => request(`/planner/grocery/checked?weekStart=${weekStart}`, { method: 'DELETE' }),
  getAnalytics: () => request('/analytics/overview'),
  adminOverview: () => request('/admin/overview'),
};

export function userIdOf(user) {
  if (!user) return '';
  if (typeof user === 'string') return user;
  return user._id || user.id || user.userId || '';
}

export function formatMinutes(min) {
  const n = Number(min) || 0;
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function weekStartStr(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export function addDaysStr(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function dayLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
