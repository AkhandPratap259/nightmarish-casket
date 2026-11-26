const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('sproutplot_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('sproutplot_token', token);
  else localStorage.removeItem('sproutplot_token');
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('sproutplot_user') || 'null');
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('sproutplot_user', JSON.stringify(user));
  else localStorage.removeItem('sproutplot_user');
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
    err.data = data;
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
  listPlants: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/plants${qs ? `?${qs}` : ''}`);
  },
  getPlant: (id) => request(`/plants/${id}`),
  getPlantCompanions: (id) => request(`/plants/${id}/companions`),
  createPlant: (body) => request('/plants', { method: 'POST', body: JSON.stringify(body) }),
  listGardens: () => request('/gardens'),
  createGarden: (body) => request('/gardens', { method: 'POST', body: JSON.stringify(body) }),
  getGarden: (id) => request(`/gardens/${id}`),
  joinGarden: (id) => request(`/gardens/${id}/join`, { method: 'POST' }),
  listBeds: (gardenId) => request(`/beds/gardens/${gardenId}/beds`),
  createBed: (gardenId, body) => request(`/beds/gardens/${gardenId}/beds`, { method: 'POST', body: JSON.stringify(body) }),
  deleteBed: (id) => request(`/beds/${id}`, { method: 'DELETE' }),
  listBedPlantings: (bedId) => request(`/plantings/beds/${bedId}/plantings`),
  myPlantings: () => request('/plantings/mine'),
  getPlanting: (id) => request(`/plantings/${id}`),
  sowPlanting: (bedId, body) => request(`/plantings/beds/${bedId}/plantings`, { method: 'POST', body: JSON.stringify(body) }),
  waterPlanting: (id) => request(`/plantings/${id}/water`, { method: 'POST' }),
  harvestPlanting: (id, body = {}) => request(`/plantings/${id}/harvest`, { method: 'POST', body: JSON.stringify(body) }),
  markLost: (id) => request(`/plantings/${id}/lost`, { method: 'POST' }),
  deletePlanting: (id) => request(`/plantings/${id}`, { method: 'DELETE' }),
  listTasks: (gardenId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/tasks/gardens/${gardenId}/tasks${qs ? `?${qs}` : ''}`);
  },
  createTask: (gardenId, body) => request(`/tasks/gardens/${gardenId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id, body) => request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  gardenAnalytics: (gardenId) => request(`/dashboard/gardens/${gardenId}`),
  myDashboard: () => request('/dashboard/me'),
  adminOverview: () => request('/admin/overview'),
  adminUsers: () => request('/admin/users'),
  adminSetUserActive: (id, active) => request(`/admin/users/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active }) }),
};
