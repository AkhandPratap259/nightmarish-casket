import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COLUMNS, PRIORITIES, api, dueLabel } from './api';
import KineticField from './components/KineticField.jsx';
import Assembly from './components/Assembly.jsx';
import Curtain from './components/Curtain.jsx';
import Cursor from './components/Cursor.jsx';
import Parallax from './components/Parallax.jsx';
import DropBurst from './components/DropBurst.jsx';
import { MotionToggle, KineticHeading, useMotionEffects } from './components/Motion.jsx';
import RadialMenu from './components/RadialMenu.jsx';
import TaskModal from './components/TaskModal.jsx';

const DEMO_EMAIL = 'demo-manager@flowboard.example';
const DEMO_PASSWORD = 'FlowBoard123!';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('flowboard-token') || '');
  const [user, setUser] = useState(null);
  const [motion, setMotion] = useState(() => localStorage.getItem('flowboard-motion') !== 'off' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [authBusy, setAuthBusy] = useState(false);
  const [boardBusy, setBoardBusy] = useState(false);
  const [boardError, setBoardError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [canvasMode, setCanvasMode] = useState(false);
  const [view, setView] = useState('board');
  const requestRef = useRef(0);
  const currentProjectRef = useRef(null);
  const sessionRef = useRef(token);

  const toastTimer = useRef(null);
  const searchRef = useRef(null);
  useMotionEffects(motion);
  useEffect(() => { localStorage.setItem('flowboard-motion', motion ? 'on' : 'off'); }, [motion]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: DEMO_EMAIL, password: DEMO_PASSWORD });
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
  /* Curtain wipe (E1) + drop bursts (TaskTrove) */
  const [curtain, setCurtain] = useState('idle');
  const curtainTimers = useRef([]);
  const [bursts, setBursts] = useState([]);
  const burstId = useRef(0);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', labels: '', dueDate: '' });
  const [newProject, setNewProject] = useState('');
  const [memberEmail, setMemberEmail] = useState('');

  /* Infinite canvas (B16) pan / zoom state */
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const panRef = useRef(null);
  const viewportRef = useRef(null);
  const kanbanRef = useRef(null);

  /* Radial menu (D15) state */
  const [radial, setRadial] = useState(null);
  const radialTriggerRefs = useRef(new Map());
  const radialTriggerRef = useRef(null);
  const lastCardRef = useRef(null);

  const showToast = useCallback((msg) => { clearTimeout(toastTimer.current); setToast(msg); toastTimer.current = setTimeout(() => setToast(''), 4500); }, []);
  /* Curtain wipe: the view swaps while the panels cover the screen, then
     they sweep away. Instant when motion is off or reduced motion is set. */
  useEffect(() => { const t = curtainTimers.current; return () => t.forEach(clearTimeout); }, []);
  const withCurtain = useCallback((fn) => {
    if (!motion || matchMedia('(prefers-reduced-motion: reduce)').matches || curtain !== 'idle') { fn(); return; }
    setCurtain('closing');
    curtainTimers.current.push(setTimeout(() => { fn(); setCurtain('opening'); }, 430));
    curtainTimers.current.push(setTimeout(() => setCurtain('idle'), 1000));
  }, [motion, curtain]);
  const fireDrop = useCallback((x, y, label) => {
    const id = ++burstId.current;
    setBursts((b) => [...b.slice(-2), { id, x, y, label }]);
  }, []);
  sessionRef.current = token;
  currentProjectRef.current = activeId;
  const activeProject = projects.find((p) => p._id === activeId) || null;

  const loadBoard = useCallback(async (projectId, tok) => {
    if (tok !== sessionRef.current || projectId !== currentProjectRef.current) return;
    const request = ++requestRef.current;
    setBoardBusy(true); setBoardError('');
    try {
      const [t, a, act] = await Promise.all([
        api(`/api/tasks/project/${projectId}`, tok),
        api(`/api/projects/${projectId}/analytics`, tok),
        api(`/api/projects/${projectId}/activity`, tok),
      ]);
      if (request !== requestRef.current) return;
      setTasks(t.tasks); setAnalytics(a); setActivity(act.activity);
    } catch (err) {
      if (request === requestRef.current) setBoardError(err.message);
    } finally {
      if (request === requestRef.current) setBoardBusy(false);
    }
  }, []);

  const loadProjects = useCallback(async (tok) => {
    const { projects: list } = await api('/api/projects', tok);
    if (tok !== sessionRef.current) return;
    setProjects(list); setBoardError('');
    if (list.length && !list.some((p) => p._id === activeId)) {
      currentProjectRef.current = list[0]._id; setActiveId(list[0]._id);
      await loadBoard(list[0]._id, tok);
    } else if (activeId) {
      await loadBoard(activeId, tok);
    }
  }, [activeId, loadBoard]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api('/api/auth/me', token)
      .then(({ user: u }) => { if (!cancelled) {setUser(u); loadProjects(token).catch((err) => setBoardError(err.message));} })
      .catch((err) => { if (!cancelled) { localStorage.removeItem('flowboard-token'); setToken(''); setUser(null); setAuthError(err.message); } });
    return () => { cancelled = true; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitAuth(e) {
    e.preventDefault();
    setAuthError(''); setAuthBusy(true);
    try {
      const { token: t, user: u } = await api(`/api/auth/${authMode}`, null, { method: 'POST', body: JSON.stringify(authForm) });
      localStorage.setItem('flowboard-token', t);
      setUser(u);
      setToken(t);
    } catch (err) { setAuthError(err.message); } finally { setAuthBusy(false); }
  }

  function logout() {
    localStorage.removeItem('flowboard-token');
    ++requestRef.current; sessionRef.current=''; currentProjectRef.current=null; setToken(''); setUser(null); setProjects([]); setTasks([]); setActiveId(null); setAnalytics(null); setActivity([]); setBoardBusy(false); setBoardError(''); setSelected(null); setRadial(null); setShowNewTask(false); setSidebarOpen(false);
    setPan({ x: 0, y: 0 }); setZoom(1);
  }

  async function selectProject(id) {
    withCurtain(() => {
      if (id !== activeId) { setTasks([]); setAnalytics(null); setActivity([]); }
      currentProjectRef.current = id; setActiveId(id); setSidebarOpen(false); setShowNewTask(false); resetView();
      setSelected(null);
      setRadial(null);
      loadBoard(id, token).catch((err) => showToast(err.message));
    });
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

  async function moveTask(id, status, coords) {
    try {
      await api(`/api/tasks/${id}/move`, token, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadBoard(activeId, token);
      let at = coords;
      if (!at) {
        const col = document.querySelector(`.column-${status}`);
        if (col) { const r = col.getBoundingClientRect(); at = { x: r.left + r.width / 2, y: r.top + Math.min(140, r.height / 3) }; }
      }
      if (at && motion) fireDrop(at.x, at.y, `Moved to ${COLUMNS.find((c) => c.key === status)?.label || status}`);
      return true;
    } catch (err) {
      setShakeCol(status);
      setTimeout(() => setShakeCol(null), 600);
      showToast(err.message);
      return false;
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

  /* Canvas panning — drag empty canvas background only; cards, buttons and
     inputs are never hijacked, so HTML5 card drags keep working. */
  function onCanvasPointerDown(e) {
    if (!canvasMode || (e.button !== 0 && e.pointerType === 'mouse')) return;
    if (e.target.closest('.card, button, input, select, a, .zoom-controls, .canvas-hint')) return;
    const start = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    panRef.current = start;
    viewportRef.current?.setPointerCapture(e.pointerId);
  }
  function onCanvasPointerMove(e) {
    const start = panRef.current;
    if (!start) return;
    setPan({
      x: Math.max(-Math.max(480, (kanbanRef.current?.scrollWidth || 0) * zoom - (viewportRef.current?.clientWidth || 0) + 100), Math.min(320, start.panX + e.clientX - start.x)),
      y: Math.max(-Math.max(320, (kanbanRef.current?.scrollHeight || 0) * zoom - (viewportRef.current?.clientHeight || 0) + 100), Math.min(240, start.panY + e.clientY - start.y)),
    });
  }
  function onCanvasPointerUp() { panRef.current = null; }
  function resetView() { setPan({ x: 0, y: 0 }); setZoom(1); }
  function fitView() {
    const vp = viewportRef.current;
    const kb = kanbanRef.current;
    if (!vp || !kb) { resetView(); return; }
    const avail = vp.clientWidth - 40; /* canvas-inner padding */
    const z = Math.max(0.25, Math.min(1, avail / kb.scrollWidth));
    setPan({ x: 0, y: 0 });
    setZoom(+z.toFixed(2));
  }

  function openRadial(task, x, y, triggerEl) {
    radialTriggerRef.current = triggerEl || null;
    setRadial({ task, x, y });
  }
  const closeRadial = useCallback(() => setRadial(null), []);

  function openTask(task, cardEl) {
    lastCardRef.current = cardEl || null;
    setSelected(task);
  }
  const closeTask = useCallback(() => { setSelected(null); lastCardRef.current?.focus(); }, []);

  const visibleTasks = useMemo(() => tasks.filter((t) => {
    if (search && ![t.title, t.description, ...(t.labels || []), t.assignee?.name].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (mineOnly && String(t.assignee?._id) !== String(user?._id)) return false;
    return true;
  }), [tasks, search, priorityFilter, mineOnly, user]);

  useEffect(() => {
    const key = (e) => {
      if (!user || selected || radial || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable) return;
      if (e.key === '/') { e.preventDefault(); setView('board'); requestAnimationFrame(() => searchRef.current?.focus()); }
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && activeId) { setView('board'); setShowNewTask(true); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [user, selected, radial, activeId]);

  if (!token || !user) {
    return (
      <div className="auth-shell page-enter">
        <Cursor motion={motion} />
        <Curtain phase={curtain} />
        <Assembly motion={motion} scene="auth" />
        <header className="auth-nav"><div className="brand"><span className="logo-mark" aria-hidden="true">↗</span> flowboard<span className="brand-period">.</span></div><span className="eyebrow auth-edition">The workspace / 001</span><MotionToggle motion={motion} setMotion={setMotion} /></header>
        <div className="auth-grid">
          <section className="auth-intro">
            <Parallax motion={motion} />
            <KineticField motion={motion} hero />
            <div className="auth-intro-content">
              <p className="eyebrow"><span className="live-dot"/> BUILT FOR WORK IN MOTION</p>
              <KineticHeading lines={['Make work', 'flow.']} motion={motion}/>
              <p className="tagline">Less noise. More momentum. A collaborative workspace for teams that move with intention.</p>
              <div className="auth-feature-grid"><div><span>01 / CONTROL</span><strong>Limit work in progress.</strong></div><div><span>02 / COLLABORATE</span><strong>Move work together.</strong></div><div><span>03 / CLARITY</span><strong>See what is stuck.</strong></div></div>
            </div>
            <div className="hero-index"><span>PROJECT MANAGEMENT SYSTEM</span><span>01 — 04 / KANBAN</span></div>
          </section>
          <section className="auth-card">
            <div className="auth-card-index eyebrow">ACCESS / YOUR WORKSPACE <span>↗</span></div>
            <h2>{authMode === 'login' ? 'Welcome back.' : 'Start a workspace.'}</h2>
            <p className="muted">{authMode === 'login' ? 'Pick up where your team left off.' : 'Create your account to organize your next project.'}</p>
            <div className="auth-tabs" role="group" aria-label="Authentication mode">
              <button type="button" aria-pressed={authMode === 'login'} className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setAuthError(''); }}>Sign in</button>
              <button type="button" aria-pressed={authMode === 'register'} className={authMode === 'register' ? 'active' : ''} onClick={() => { setAuthMode('register'); setAuthError(''); setAuthForm({name:'',email:'',password:''}); }}>Create account</button>
            </div>
            <form onSubmit={submitAuth} className="auth-form">
              {authMode === 'register' && <label>Full name<input autoComplete="name" placeholder="Your name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} required /></label>}
              <label>Email address<input autoComplete="email" placeholder="you@example.com" type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} required /></label>
              <label>Password<input autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} placeholder="Enter password" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} required minLength={6}/></label>
              {authError && <p className="error" role="alert">{authError}</p>}
              <button className="primary magnetic auth-submit" disabled={authBusy} type="submit">{authBusy ? 'Connecting…' : authMode === 'login' ? 'Enter workspace' : 'Create account'} <span aria-hidden="true">↗</span></button>
            </form>
            <button className="demo-btn" type="button" onClick={() => { setAuthMode('login'); setAuthError(''); setAuthForm({ name: '', email: DEMO_EMAIL, password: DEMO_PASSWORD }); }}>Fill demo credentials <span aria-hidden="true">↘</span></button>
            <p className="auth-note">Demo data is seeded by the development API. Sign in after the server is running.</p>
          </section>
        </div>
        <footer className="auth-foot"><span>© 2026 Akhand</span><span>DESIGNED FOR FOCUS · BUILT FOR FLOW</span></footer>
      </div>
    );
  }

  const donutPct = analytics?.completion || 0;
  const circumference = 2 * Math.PI * 42;

  return (
    <div className="app page-enter">
      <Cursor motion={motion} />
      <Curtain phase={curtain} />
      <DropBurst bursts={bursts} onDone={(id) => setBursts((b) => b.filter((x) => x.id !== id))} />
      <Assembly motion={motion} scene={`${activeId || 'empty'}:${view}:${canvasMode}`} drawer={selected?._id} />
      <div className="mobile-top"><div className="brand">flowboard<span className="brand-period">.</span></div><button type="button" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? 'Close' : 'Menu'} ☰</button></div>
      {sidebarOpen && <button type="button" aria-label="Close navigation" className="sidebar-overlay" onClick={() => setSidebarOpen(false)}/>}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="logo-mark small" aria-hidden="true">↗</span> flowboard<span className="brand-period">.</span></div>
        <p className="sidebar-label">Workspace / 01</p>
        <nav className="view-nav" aria-label="Workspace views"><button className={view === 'board' ? 'active' : ''} onClick={() => {withCurtain(() => setView('board'));setSidebarOpen(false);}}><span>▦</span> Board <small>01</small></button><button className={view === 'insights' ? 'active' : ''} onClick={() => {withCurtain(() => setView('insights'));setSidebarOpen(false);}}><span>◔</span> Insights <small>02</small></button></nav>
        <p className="sidebar-label">Projects</p>
        <div className="project-list">
          {projects.map((p) => (
            <button key={p._id} type="button" className={p._id === activeId ? 'project-item active' : 'project-item'} onClick={() => selectProject(p._id)}>
              <span className="dot" aria-hidden="true">{p.name.slice(0,1).toUpperCase()}</span>
              <span className="project-name">{p.name}</span>
            </button>
          ))}
        </div>
        <form onSubmit={createProject} className="mini-form">
          <input placeholder="New project name…" value={newProject} onChange={(e) => setNewProject(e.target.value)} aria-label="New project name" />
          <button type="submit">+ Create</button>
        </form>
        {activeProject && (
          <>
            <p className="sidebar-label">Members</p>
            <ul className="members">
              {(activeProject.members || []).map((m) => <li key={m._id || m}><span className="avatar">{(m.name || String(m)).slice(0,2).toUpperCase()}</span><span>{m.name || (String(m) === user._id ? user.name : 'Member')}</span></li>)}
            </ul>
            {String(activeProject.owner) === String(user._id) && <form onSubmit={addMember} className="mini-form">
              <input placeholder="Add member by email…" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} aria-label="Add member by email" />
              <button type="submit">Add</button>
            </form>}
          </>
        )}
        <div className="sidebar-foot">
          <span className="account"><span className="avatar">{user.name.slice(0,2).toUpperCase()}</span><span>{user.name}<small>Signed in</small></span></span>
          <button type="button" onClick={logout} aria-label="Sign out">↗</button>
        </div>
        <MotionToggle motion={motion} setMotion={setMotion}/><p className="sidebar-copy">© 2026 Akhand</p>
      </aside>

      <main className="board-area">
        <div className="workspace-top"><span className="eyebrow">WORKSPACE <span className="slash">/</span> {view === 'board' ? 'BOARD' : 'INSIGHTS'}</span><span className="eyebrow"><span className="live-dot"/> {boardBusy ? 'SYNCING' : 'PROJECT WORKSPACE'}</span></div>
        <header className="board-head">
          <div>
            <p className="eyebrow project-kicker">{view === 'board' ? '01 / THE WORK' : '02 / THE NUMBERS'}</p>
            <h1 key={activeId}>{activeProject?.name || 'No project yet'}<span className="brand-period">.</span></h1>
            <p>{activeProject?.description || (activeProject ? 'Organize tasks, coordinate your team and track progress.' : 'Create a project from the sidebar to start moving cards.')}</p>
          </div>
          <button className="primary magnetic" type="button" disabled={!activeProject} onClick={() => {setView('board');setShowNewTask(true);}}>+ New task <kbd>N</kbd></button>
        </header>

        {boardError && <div className="error board-error" role="alert">{boardError} <button onClick={() => activeId ? loadBoard(activeId, token) : loadProjects(token).catch(e=>setBoardError(e.message))}>Retry</button></div>}
        <div className="metric-strip" aria-label="Project summary">
          {[['Total tasks', analytics?.total], ['In progress', analytics?.byStatus?.['in-progress']], ['Overdue', analytics?.overdue], ['Completion', analytics ? `${analytics.completion}%` : null]].map(([label,value],i) => <div className={`metric metric-${i}`} key={label}><span className="eyebrow">0{i+1} / {label}</span><strong key={String(value)}>{value ?? '—'}</strong>{i===3 && <div className="metric-progress"><i style={{width:`${analytics?.completion || 0}%`}}/></div>}</div>)}
        </div>
        {view === 'board' && <>
        <div className="section-heading"><div><span className="eyebrow">01 / FLOW</span><h2>Task board</h2></div><div className="view-switch"><button type="button" aria-pressed={!canvasMode} onClick={()=>{setCanvasMode(false);resetView();}}>Board</button><button type="button" aria-pressed={canvasMode} onClick={()=>{setCanvasMode(true);resetView();}}>Canvas ↗</button></div></div>
        <div className="filter-bar">
          <input ref={searchRef} className="search" placeholder="Search tasks / labels…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search tasks" />
          <div className="chips" role="group" aria-label="Filter tasks">
            <button type="button" className={priorityFilter === 'all' ? 'chip active' : 'chip'} onClick={() => setPriorityFilter('all')}>All</button>
            {PRIORITIES.map((p) => (
              <button key={p} type="button" className={priorityFilter === p ? `chip active pri-${p}` : `chip pri-${p}`} onClick={() => setPriorityFilter(p)}>{p}</button>
            ))}
            <button type="button" className={mineOnly ? 'chip active' : 'chip'} aria-pressed={mineOnly} onClick={() => setMineOnly((v) => !v)}>★ My tasks</button>
          </div>
        </div>

        {showNewTask && activeProject && (
          <form onSubmit={createTask} className="new-task-form">
            <input placeholder="Task title…" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} required aria-label="Task title" />
            <input placeholder="Description (optional)" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} aria-label="Description" />
            <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} aria-label="Priority">
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input placeholder="Labels, comma separated" value={newTask.labels} onChange={(e) => setNewTask({ ...newTask, labels: e.target.value })} aria-label="Labels" />
            <input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} aria-label="Due date" />
            <div className="edit-actions"><button className="primary" type="submit">Add to To Do</button><button type="button" onClick={()=>setShowNewTask(false)}>Cancel</button></div>
          </form>
        )}

        {!activeProject && <div className="empty-project"><h3>Start with a project.</h3><p>Create one using the workspace sidebar.</p></div>}
        {activeProject && <div
          className={`canvas-viewport ${canvasMode ? 'canvas-mode' : 'board-mode'}`}
          ref={viewportRef}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onPointerCancel={onCanvasPointerUp}
        >
          <KineticField tasks={tasks} motion={motion} />
          <div className="canvas-inner" style={canvasMode ? { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` } : undefined}>
            <div className="kanban" ref={kanbanRef}>
              {COLUMNS.map((col) => {
                const cards = visibleTasks.filter((t) => t.status === col.key);
                const fullCount = tasks.filter(t => t.status === col.key).length;
                const fill = col.limit ? Math.round((fullCount / col.limit) * 100) : 0;
                return (
                  <section
                    key={col.key}
                    className={`column column-${col.key} ${dropCol === col.key ? 'dropping' : ''} ${shakeCol === col.key ? 'shake' : ''}`}
                    aria-label={`${col.label} column`}
                    onDragOver={(e) => { e.preventDefault(); setDropCol(col.key); }}
                    onDragLeave={() => setDropCol(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDropCol(null);
                      const id = dragId || e.dataTransfer.getData('text/plain');
                      if (tasks.some(t => t._id === id)) moveTask(id, col.key, { x: e.clientX, y: e.clientY });
                    }}
                  >
                    <div className="column-head">
                      <div className="column-title"><span className="status-mark"/><h2>{col.label}</h2></div>
                      <span className="count" title={cards.length !== fullCount ? `${cards.length} shown of ${fullCount} total` : undefined}>{fullCount}{col.limit ? ` / ${col.limit}` : ''}</span>
                    </div>
                    {col.limit && (
                      <><div className="wip-caption">WIP capacity <span>{fullCount >= col.limit ? 'LIMIT REACHED' : `${col.limit - fullCount} available`}</span></div><div className="wip-bar"><div className={fill >= 100 ? 'wip-fill full' : 'wip-fill'} style={{ width: `${Math.min(fill, 100)}%` }} /></div></>
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
                            className="card spot-card"
                            style={{ animationDelay: `${Math.min(i * 45, 225)}ms` }}
                            draggable
                            tabIndex={0}
                            role="button"
                            aria-label={`${t.title}, ${col.label}, priority ${t.priority}`}
                            onDragStart={(e) => { e.dataTransfer.setData('text/plain', t._id); e.dataTransfer.effectAllowed = 'move'; setDragId(t._id); setRadial(null); }}
                            onDragEnd={() => {setDragId(null);setDropCol(null);}}
                            onClick={(e) => { if (e.target.closest('.card-menu-btn')) return; openTask(t, e.currentTarget); }}
                            onKeyDown={(e) => {
                              if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openTask(t, e.currentTarget); }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              openRadial(t, e.clientX, e.clientY, radialTriggerRefs.current.get(t._id));
                            }}
                          >
                            <div className="card-top">
                              <span className={`priority pri-${t.priority}`}>{t.priority}</span>
                              {overdue && <span className="overdue-badge">Overdue</span>}
                              <button
                                type="button"
                                className="card-menu-btn"
                                aria-label={`Card actions for ${t.title}`}
                                aria-haspopup="menu"
                                ref={(el) => { if (el) radialTriggerRefs.current.set(t._id, el); else radialTriggerRefs.current.delete(t._id); }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const r = e.currentTarget.getBoundingClientRect();
                                  openRadial(t, r.left + r.width / 2, r.top + r.height / 2, e.currentTarget);
                                }}
                              >⋯</button>
                            </div>
                            <h3>{t.title}</h3>{t.description && <p className="card-description">{t.description}</p>}
                            {t.labels?.length > 0 && (
                              <div className="labels">{t.labels.map((l) => <span key={l} className="label">{l}</span>)}</div>
                            )}
                            {pct !== null && (
                              <>
                                <div className="check-progress"><div className="check-fill" style={{ width: `${pct}%` }} /></div>
                                <p className="check-text">{done}/{total} checklist · {pct}%</p>
                              </>
                            )}
                            <div className="card-foot">
                              <span className="card-person"><span className="avatar">{(t.assignee?.name || '—').slice(0,2).toUpperCase()}</span>{t.assignee?.name || 'Unassigned'}</span>
                              <span>{dueLabel(t.dueDate, t.status) || 'No due date'}</span>
                            </div>
                          </article>
                        );
                      })}
                      {cards.length === 0 && <p className="empty-col">{fullCount ? 'No matching tasks' : 'Drop cards here'}</p>}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
          {canvasMode && <div className="zoom-controls" role="group" aria-label="Canvas zoom controls">
            <button type="button" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))} aria-label="Zoom in">+</button>
            <span className="zoom-level" aria-live="polite">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.1).toFixed(2)))} aria-label="Zoom out">−</button>
            <button type="button" onClick={resetView}>Reset</button>
            <button type="button" onClick={fitView}>Fit</button>
          </div>}
          {canvasMode && <p className="canvas-hint">Drag empty canvas to pan · Right-click a card for quick actions</p>}
        </div>}
        <div className="board-footer"><span>{visibleTasks.length} of {tasks.length} tasks shown</span><span>DRAG TO MOVE · ⋯ FOR ACTIONS</span></div>
        </>}
        <div className="section-heading insight-heading"><div><span className="eyebrow">02 / INSIGHTS</span><h2>Health & activity</h2></div><button className="refresh-button" disabled={boardBusy || !activeId} onClick={()=>loadBoard(activeId,token)}>↻ Refresh</button></div>

        <div className="bottom-panels">
          <section className="panel spot-card analytics-panel" aria-label="Board health">
            <h2>Board health <span>↗</span></h2>
            {analytics ? (
              <div className="analytics-grid">
                <div className="donut-wrap">
                  <svg viewBox="0 0 100 100" className="donut" role="img" aria-label={`${donutPct}% complete`}>
                    <circle cx="50" cy="50" r="42" className="donut-bg" />
                    <circle cx="50" cy="50" r="42" className="donut-fg" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - donutPct / 100)} />
                  </svg>
                  <div className="donut-centre"><strong>{donutPct}%</strong><span>complete</span></div>
                </div>
                <div>
                  <p><strong>{analytics.total}</strong> tasks · <strong>{analytics.overdue}</strong> overdue</p>
                  <div className="stat-bars">
                    {COLUMNS.map((c, i) => (
                      <div key={c.key} className="stat-row">
                        <span>{c.label}</span>
                        <div className="stat-bar"><div className={`stat-fill fill-${i}`} style={{ width: analytics.total ? `${(analytics.byStatus[c.key] / analytics.total) * 100}%` : '0%' }} /></div>
                        <span>{analytics.byStatus[c.key]}</span>
                      </div>
                    ))}
                  </div>
                  <p className="workload-title">Workload</p>
                  <ul className="workload">
                    {Object.entries(analytics.byMember).map(([name, n]) => <li key={name}><span>{name}</span><strong>{n}</strong></li>)}
                    {Object.keys(analytics.byMember).length === 0 && <li className="muted">No assigned tasks yet.</li>}
                  </ul>
                </div>
              </div>
            ) : <p className="muted">{boardBusy ? 'Loading analytics…' : activeProject ? 'Analytics unavailable.' : 'Create a project to see analytics.'}</p>}
          </section>
          <section className="panel spot-card activity-panel" aria-label="Activity">
            <h2>Activity <span>↗</span></h2>
            <ul className="activity">
              {activity.map((a) => (
                <li key={a._id}><strong>{a.actor?.name}</strong> {a.action} <em>{a.taskTitle}</em><span>{new Date(a.createdAt).toLocaleString()}</span></li>
              ))}
              {activity.length === 0 && <li>No activity yet.</li>}
            </ul>
          </section>
        </div>
      </main>

      {radial && (
        <RadialMenu
          task={radial.task}
          position={{ x: radial.x, y: radial.y }}
          triggerRef={radialTriggerRef}
          onOpen={(t) => openTask(t, radialTriggerRef.current?.closest('.card'))}
          onMove={(t, status) => moveTask(t._id, status)}
          onClose={closeRadial}
        />
      )}
      {selected && (
        <TaskModal
          task={selected}
          userId={user._id}
          token={token}
          members={activeProject?.members || []}
          onClose={closeTask}
          onReload={(updated) => {
            if (updated) setSelected(current => current?._id === updated._id ? updated : current);
            if (activeId) loadBoard(activeId, token).catch(() => {});
          }}
          showToast={showToast}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
