// Tiny fetch wrapper: attaches the JWT, talks to the Vite /api proxy.
const BASE = '/api';

export function getToken() {
  return localStorage.getItem('paisapilot-token');
}

export function setToken(token) {
  if (token) localStorage.setItem('paisapilot-token', token);
  else localStorage.removeItem('paisapilot-token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  health: () => request('/health', { auth: false }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),
  accounts: () => request('/accounts'),
  addAccount: (payload) => request('/accounts', { method: 'POST', body: payload }),
  transfer: (payload) => request('/accounts/transfer', { method: 'POST', body: payload }),
  categories: () => request('/categories'),
  transactions: (params = '') => request(`/transactions${params}`),
  addTransaction: (payload) => request('/transactions', { method: 'POST', body: payload }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
  budgets: (month) => request(`/budgets?month=${month}`),
  upsertBudget: (payload) => request('/budgets', { method: 'POST', body: payload }),
  goals: () => request('/goals'),
  addGoal: (payload) => request('/goals', { method: 'POST', body: payload }),
  contributeGoal: (id, amount) => request(`/goals/${id}/contribute`, { method: 'POST', body: { amount } }),
  recurring: () => request('/recurring'),
  toggleRecurring: (id, active) => request(`/recurring/${id}`, { method: 'PATCH', body: { active } }),
  generateDue: () => request('/recurring/generate-due', { method: 'POST' }),
  overview: (month) => request(`/analytics/overview?month=${month}`),
  exportCsv: (params = '') => {
    const a = document.createElement('a');
    a.href = `${BASE}/transactions/export${params}`;
    a.download = 'paisapilot-transactions.csv';
    // Auth for a plain navigation: token via query is avoided; instead fetch as blob.
    fetch(a.href, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'paisapilot-transactions.csv';
        link.click();
        URL.revokeObjectURL(url);
      });
  },
};
