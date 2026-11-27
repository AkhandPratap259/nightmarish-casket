export const COLUMNS = [
  { key: 'todo', label: 'To Do', limit: null },
  { key: 'in-progress', label: 'In Progress', limit: 4 },
  { key: 'review', label: 'Review', limit: 3 },
  { key: 'done', label: 'Done', limit: null },
];
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export async function api(path, token, options = {}) {
  let res;
  try { res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  }); } catch { throw new Error('Cannot reach FlowBoard API. Check that the server is running.'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function dueLabel(dueDate, status) {
  if (!dueDate) return null;
  const diff = Math.ceil((new Date(dueDate) - new Date()) / 86400000);
  if (status === 'done') return 'Done';
  if (diff < 0) return `${-diff}d overdue`;
  if (diff === 0) return 'Due today';
  return `Due in ${diff}d`;
}
