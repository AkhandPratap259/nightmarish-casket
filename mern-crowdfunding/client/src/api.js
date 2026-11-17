const API = '/api';

function getToken() {
  return localStorage.getItem('fundforge_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('fundforge_token', token);
  else localStorage.removeItem('fundforge_token');
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('fundforge_user') || 'null');
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('fundforge_user', JSON.stringify(user));
  else localStorage.removeItem('fundforge_user');
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
  // The API wraps every success payload in a {data} envelope; unwrap it
  // here so every caller sees the bare shape it expects.
  return data && typeof data === 'object' && 'data' in data ? data.data : data;
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
  campaigns: (params = {}) => request(withQuery('/campaigns', params)),
  campaign: (id) => request(`/campaigns/${id}`),
  createCampaign: (payload) => request('/campaigns', { method: 'POST', body: payload }),
  updateCampaign: (id, payload) => request(`/campaigns/${id}`, { method: 'PUT', body: payload }),
  publishCampaign: (id) => request(`/campaigns/${id}/publish`, { method: 'POST' }),
  fulfillCampaign: (id) => request(`/campaigns/${id}/fulfill`, { method: 'POST' }),
  deleteCampaign: (id) => request(`/campaigns/${id}`, { method: 'DELETE' }),
  createPledge: (id, payload) => request(`/campaigns/${id}/pledges`, { method: 'POST', body: payload }),
  campaignPledges: (id) => request(`/campaigns/${id}/pledges`),
  myPledges: () => request('/pledges/mine'),
  campaignUpdates: (id) => request(`/campaigns/${id}/updates`),
  createUpdate: (id, payload) => request(`/campaigns/${id}/updates`, { method: 'POST', body: payload }),
  campaignComments: (id) => request(`/campaigns/${id}/comments`),
  createComment: (id, payload) => request(`/campaigns/${id}/comments`, { method: 'POST', body: payload }),
  adminOverview: () => request('/admin/overview'),
};
