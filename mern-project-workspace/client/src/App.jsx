import { useCallback, useEffect, useMemo, useState } from 'react';

const COLUMNS = [
  { key: 'todo', label: 'To Do', limit: null },
  { key: 'in-progress', label: 'In Progress', limit: 4 },
  { key: 'review', label: 'Review', limit: 3 },
  { key: 'done', label: 'Done', limit: null },
];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

async function api(path, token, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function dueLabel(dueDate, status) {
  if (!dueDate) return null;
  const diff = Math.ceil((new Date(dueDate) - new Date()) / 86400000);
  if (status === 'done') return 'Done';
  if (diff < 0) return `${-diff}d overdue`;
  if (diff === 0) return 'Due today';
  return `Due in ${diff}d`;
}

function tilt(e) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`);
  el.style.setProperty('--ry', `${(x * 9).toFixed(2)}deg`);
}
function untilt(e) {
  e.currentTarget.style.setProperty('--rx', '0deg');
  e.currentTarget.style.setProperty('--ry', '0deg');
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('flowboard-token') || '');
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: 'demo-manager@flowboard.example', password: 'FlowBoard123!' });
  const [authError, setAuthError] = useState('');
  const [projects, setProjects] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activity, setActivity] = useState([]);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [mineOnly, setMineOnly] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dropCol, setDropCol] = useState(null);
  const [shakeCol, setShakeCol] = useState(null);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', labels: '', dueDate: '' });
  const [newProject, setNewProject] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [checkText, setCheckText] = useState('');
  const [commentText, setCommentText] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };
  const activeProject = projects.find((p) => p._id === activeId) || null;

  const loadBoard = useCallback(async (projectId, tok) => {
    const [t, a, act] = await Promise.all([
      api(`/api/tasks/project/${projectId}`, tok),
      api(`/api/projects/${projectId}/analytics`, tok),
      api(`/api/projects/${projectId}/activity`, tok),
    ]);
    setTasks(t.tasks);
    setAnalytics(a);
    setActivity(act.activity);
  }, []);

  const loadProjects = useCallback(async (tok) => {
    const { projects: list } = await api('/api/projects', tok);
    setProjects(list);
    if (list.length && !list.some((p) => p._id === activeId)) {
      setActiveId(list[0]._id);
      await loadBoard(list[0]._id, tok);
    } else if (activeId) {
      await loadBoard(activeId, tok);
    }
  }, [activeId, loadBoard]);

  useEffect(() => {
    if (!token) return;
    api('/api/auth/me', token)
      .then(({ user: u }) => { setUser(u); loadProjects(token).catch(() => {}); })
      .catch(() => { localStorage.removeItem('flowboard-token'); setToken(''); });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitAuth(e) {
    e.preventDefault();
    setAuthError('');
    try {
      const { token: t, user: u } = await api(`/api/auth/${authMode}`, null, { method: 'POST', body: JSON.stringify(authForm) });
      localStorage.setItem('flowboard-token', t);
      setUser(u);
      setToken(t);
    } catch (err) { setAuthError(err.message); }
  }

  function logout() {
    localStorage.removeItem('flowboard-token');
    setToken(''); setUser(null); setProjects([]); setTasks([]);
  }

  async function selectProject(id) {
    setActiveId(id);
    setSelected(null);
    try { await loadBoard(id, token); } catch (err) { showToast(err.message); }
  }

  async function createProject(e) {
    e.preventDefault();
    if (!newProject.trim()) return;
    try {
      const { project } = await api('/api/projects', token, { method: 'POST', body: JSON.stringify({ name: newProject }) });
      setProjects((p) => [project, ...p]);
      setNewProject('');
      await selectProject(project._id);
    } catch (err) { showToast(err.message); }
  }

  async function createTask(e) {
    e.preventDefault();
    if (!newTask.title.trim() || !activeId) return;
    try {
      await api(`/api/tasks/project/${activeId}`, token, {
        method: 'POST',
        body: JSON.stringify({ ...newTask, dueDate: newTask.dueDate || null }),
      });
      setNewTask({ title: '', description: '', priority: 'medium', labels: '', dueDate: '' });
      setShowNewTask(false);
      await loadBoard(activeId, token);
      showToast('Task added to the board');
    } catch (err) { showToast(err.message); }
  }

  async function moveTask(id, status) {
    try {
      await api(`/api/tasks/${id}/move`, token, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadBoard(activeId, token);
    } catch (err) {
      setShakeCol(status);
      setTimeout(() => setShakeCol(null), 600);
      showToast(err.message);
    }
  }

  async function addMember(e) {
    e.preventDefault();
    try {
      const { project } = await api(`/api/projects/${activeId}/members`, token, { method: 'POST', body: JSON.stringify({ email: memberEmail }) });
      setProjects((ps) => ps.map((p) => (p._id === project._id ? project : p)));
      setMemberEmail('');
      showToast('Member added');
    } catch (err) { showToast(err.message); }
  }

  const visibleTasks = useMemo(() => tasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (mineOnly && String(t.assignee?._id) !== String(user?._id)) return false;
    return true;
  }), [tasks, search, priorityFilter, mineOnly, user]);

  if (!token || !user) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="logo-mark">⬢</div>
          <h1>FlowBoard</h1>
          <p className="tagline">A collaborative workspace where work moves — drag cards, respect WIP limits, and watch the board tell you what is stuck.</p>
          <div className="auth-tabs">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Sign in</button>
            <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Create account</button>
          </div>
          <form onSubmit={submitAuth} className="auth-form">
            {authMode === 'register' && <input placeholder="Full name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} required />}
            <input placeholder="Email" type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} required />
            <input placeholder="Password" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} required />
            {authError && <p className="error">{authError}</p>}
            <button className="primary" type="submit">{authMode === 'login' ? 'Enter workspace' : 'Create account'}</button>
          </form>
          <button className="demo-btn" onClick={() => { setAuthMode('login'); setAuthForm({ name: '', email: 'demo-manager@flowboard.example', password: 'FlowBoard123!' }); }}>
            Use demo account — demo-manager@flowboard.example / FlowBoard123!
          </button>
        </div>
      </div>
    );
  }

  const donutPct = analytics?.completion || 0;
  const circumference = 2 * Math.PI * 42;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="logo-mark small">⬢</span> FlowBoard</div>
        <p className="sidebar-label">Projects</p>
        <div className="project-list">
          {projects.map((p) => (
            <button key={p._id} className={p._id === activeId ? 'project-item active' : 'project-item'} onClick={() => selectProject(p._id)}>
              <span className="dot" style={{ background: p.color }} />
              <span className="project-name">{p.name}</span>
            </button>
          ))}
        </div>
        <form onSubmit={createProject} className="mini-form">
          <input placeholder="New project name…" value={newProject} onChange={(e) => setNewProject(e.target.value)} />
          <button type="submit">+ Create</button>
        </form>
        {activeProject && (
          <>
            <p className="sidebar-label">Members</p>
            <ul className="members">
              {(activeProject.members || []).map((m) => <li key={m._id || m}>{m.name || m}</li>)}
            </ul>
            <form onSubmit={addMember} className="mini-form">
              <input placeholder="Add member by email…" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} />
              <button type="submit">Add</button>
            </form>
          </>
        )}
        <div className="sidebar-foot">
          <span>{user.name}</span>
          <button onClick={logout}>Sign out</button>
        </div>
      </aside>

      <main className="board-area">
        <header className="board-head">
          <div>
            <h1>{activeProject?.name || 'No project yet'}</h1>
            <p>{activeProject?.description || 'Create a project from the sidebar to start moving cards.'}</p>
          </div>
          <button className="primary" onClick={() => setShowNewTask((v) => !v)}>+ New task</button>
        </header>

        <div className="filter-bar">
          <input className="search" placeholder="🔍 Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="chips">
            <button className={priorityFilter === 'all' ? 'chip active' : 'chip'} onClick={() => setPriorityFilter('all')}>All</button>
            {PRIORITIES.map((p) => (
              <button key={p} className={priorityFilter === p ? `chip active pri-${p}` : `chip pri-${p}`} onClick={() => setPriorityFilter(p)}>{p}</button>
            ))}
            <button className={mineOnly ? 'chip active' : 'chip'} onClick={() => setMineOnly((v) => !v)}>★ My tasks</button>
          </div>
        </div>

        {showNewTask && activeProject && (
          <form onSubmit={createTask} className="new-task-form">
            <input placeholder="Task title…" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} required />
            <input placeholder="Description (optional)" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} />
            <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input placeholder="Labels, comma separated" value={newTask.labels} onChange={(e) => setNewTask({ ...newTask, labels: e.target.value })} />
            <input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
            <button className="primary" type="submit">Add to To Do</button>
          </form>
        )}

        <div className="kanban">
          {COLUMNS.map((col) => {
            const cards = visibleTasks.filter((t) => t.status === col.key);
            const fill = col.limit ? Math.round((cards.length / col.limit) * 100) : 0;
            return (
              <section
                key={col.key}
                className={`column ${dropCol === col.key ? 'dropping' : ''} ${shakeCol === col.key ? 'shake' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDropCol(col.key); }}
                onDragLeave={() => setDropCol(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDropCol(null);
                  if (dragId) moveTask(dragId, col.key);
                }}
              >
                <div className="column-head">
                  <h2>{col.label}</h2>
                  <span className="count">{cards.length}{col.limit ? ` / ${col.limit}` : ''}</span>
                </div>
                {col.limit && (
                  <div className="wip-bar"><div className={fill >= 100 ? 'wip-fill full' : 'wip-fill'} style={{ width: `${fill}%` }} /></div>
                )}
                <div className="cards">
                  {cards.map((t, i) => {
                    const total = t.checklist?.length || 0;
                    const done = t.checklist?.filter((c) => c.done).length || 0;
                    const pct = total ? Math.round((done / total) * 100) : null;
                    const overdue = t.dueDate && t.status !== 'done' && new Date(t.dueDate) < new Date();
                    return (
                      <article
                        key={t._id}
                        className="card"
                        style={{ animationDelay: `${i * 60}ms` }}
                        draggable
                        onDragStart={() => setDragId(t._id)}
                        onDragEnd={() => setDragId(null)}
                        onMouseMove={tilt}
                        onMouseLeave={untilt}
                        onClick={() => setSelected(t)}
                      >
                        <div className="card-top">
                          <span className={`priority pri-${t.priority}`}>{t.priority}</span>
                          {overdue && <span className="overdue-badge">Overdue</span>}
                        </div>
                        <h3>{t.title}</h3>
                        {t.labels?.length > 0 && (
                          <div className="labels">{t.labels.map((l) => <span key={l} className="label">{l}</span>)}</div>
                        )}
                        {pct !== null && (
                          <div className="check-progress"><div className="check-fill" style={{ width: `${pct}%` }} /><span>{done}/{total} checklist · {pct}%</span></div>
                        )}
                        <div className="card-foot">
                          <span>{t.assignee?.name || 'Unassigned'}</span>
                          <span>{dueLabel(t.dueDate, t.status) || 'No due date'}</span>
                        </div>
                      </article>
                    );
                  })}
                  {cards.length === 0 && <p className="empty-col">Drop cards here</p>}
                </div>
              </section>
            );
          })}
        </div>

        <div className="bottom-panels">
          <section className="panel analytics-panel">
            <h2>Board health</h2>
            {analytics ? (
              <div className="analytics-grid">
                <div className="donut-wrap">
                  <svg viewBox="0 0 100 100" className="donut">
                    <circle cx="50" cy="50" r="42" className="donut-bg" />
                    <circle cx="50" cy="50" r="42" className="donut-fg" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - donutPct / 100)} />
                  </svg>
                  <div className="donut-centre"><strong>{donutPct}%</strong><span>complete</span></div>
                </div>
                <div>
                  <p><strong>{analytics.total}</strong> tasks · <strong>{analytics.overdue}</strong> overdue</p>
                  <div className="stat-bars">
                    {COLUMNS.map((c) => (
                      <div key={c.key} className="stat-row">
                        <span>{c.label}</span>
                        <div className="stat-bar"><div style={{ width: analytics.total ? `${(analytics.byStatus[c.key] / analytics.total) * 100}%` : '0%' }} /></div>
                        <span>{analytics.byStatus[c.key]}</span>
                      </div>
                    ))}
                  </div>
                  <p className="workload-title">Workload</p>
                  <ul className="workload">
                    {Object.entries(analytics.byMember).map(([name, n]) => <li key={name}><span>{name}</span><strong>{n}</strong></li>)}
                  </ul>
                </div>
              </div>
            ) : <p>Loading analytics…</p>}
          </section>
          <section className="panel activity-panel">
            <h2>Activity</h2>
            <ul className="activity">
              {activity.map((a) => (
                <li key={a._id}><strong>{a.actor?.name}</strong> {a.action} <em>{a.taskTitle}</em><span>{new Date(a.createdAt).toLocaleString()}</span></li>
              ))}
              {activity.length === 0 && <li>No activity yet.</li>}
            </ul>
          </section>
        </div>
      </main>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            <span className={`priority pri-${selected.priority}`}>{selected.priority}</span>
            <h2>{selected.title}</h2>
            <p>{selected.description || 'No description.'}</p>
            <div className="modal-row">
              <label>Move to</label>
              <select value={selected.status} onChange={async (e) => {
                try {
                  const { task } = await api(`/api/tasks/${selected._id}/move`, token, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) });
                  setSelected(task);
                  await loadBoard(activeId, token);
                } catch (err) { showToast(err.message); }
              }}>
                {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <h3>Checklist</h3>
            <ul className="checklist">
              {selected.checklist?.map((item) => (
                <li key={item._id}>
                  <input type="checkbox" checked={item.done} onChange={async () => {
                    const { task } = await api(`/api/tasks/${selected._id}/checklist/${item._id}`, token, { method: 'PATCH', body: JSON.stringify({ done: !item.done }) });
                    setSelected(task);
                    await loadBoard(activeId, token);
                  }} />
                  <span className={item.done ? 'done-item' : ''}>{item.text}</span>
                </li>
              ))}
            </ul>
            <form className="mini-form" onSubmit={async (e) => {
              e.preventDefault();
              if (!checkText.trim()) return;
              const { task } = await api(`/api/tasks/${selected._id}/checklist`, token, { method: 'POST', body: JSON.stringify({ text: checkText }) });
              setSelected(task); setCheckText('');
              await loadBoard(activeId, token);
            }}>
              <input placeholder="Add checklist item…" value={checkText} onChange={(e) => setCheckText(e.target.value)} />
              <button type="submit">Add</button>
            </form>
            <h3>Comments</h3>
            <ul className="comments">
              {selected.comments?.map((c) => <li key={c._id}><strong>{c.author?.name}</strong>: {c.text}</li>)}
              {(!selected.comments || selected.comments.length === 0) && <li>No comments yet.</li>}
            </ul>
            <form className="mini-form" onSubmit={async (e) => {
              e.preventDefault();
              if (!commentText.trim()) return;
              const { task } = await api(`/api/tasks/${selected._id}/comments`, token, { method: 'POST', body: JSON.stringify({ text: commentText }) });
              setSelected(task); setCommentText('');
              await loadBoard(activeId, token);
            }}>
              <input placeholder="Write a comment…" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
              <button type="submit">Post</button>
            </form>
            <button className="danger" onClick={async () => {
              await api(`/api/tasks/${selected._id}`, token, { method: 'DELETE' });
              setSelected(null);
              await loadBoard(activeId, token);
            }}>Delete task</button>
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
