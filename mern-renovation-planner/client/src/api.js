import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('homedraft-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getUser() {
  try { return JSON.parse(localStorage.getItem('homedraft-user') || 'null'); } catch { return null; }
}
export function saveAuth(token, user) {
  localStorage.setItem('homedraft-token', token);
  localStorage.setItem('homedraft-user', JSON.stringify(user));
}
export function clearAuth() {
  localStorage.removeItem('homedraft-token');
  localStorage.removeItem('homedraft-user');
}
export function isLoggedIn() { return !!localStorage.getItem('homedraft-token'); }

export default api;
