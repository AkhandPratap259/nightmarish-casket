import React, { useEffect, useState } from 'react';

const api = async (path, { token, method = 'GET', body } = {}) => {
  const res = await fetch(path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('learnloop-user') || 'null'));
  const [token, setToken] = useState(() => localStorage.getItem('learnloop-token') || '');
  const [view, setView] = useState('browse');
  const [courses, setCourses] = useState([]);
  const [detail, setDetail] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [mine, setMine] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [courseForm, setCourseForm] = useState({ title: '', description: '', category: 'Web Development', level: 'beginner', price: 0 });

  const loadCourses = async () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (level) params.set('level', level);
    const data = await api(`/api/courses?${params}`);
    setCourses(data.courses);
  };
  useEffect(() => { loadCourses().catch((e) => setError(e.message)); }, [view]);
  const loadLearning = async () => { setEnrollments(await api('/api/enrollments/mine', { token })); };
  const loadMine = async () => { setMine(await api('/api/courses/mine', { token })); };

  const saveAuth = (data) => {
    setUser(data.user); setToken(data.token);
    localStorage.setItem('learnloop-user', JSON.stringify(data.user));
    localStorage.setItem('learnloop-token', data.token);
    setView('browse');
  };
  const logout = () => { setUser(null); setToken(''); localStorage.removeItem('learnloop-user'); localStorage.removeItem('learnloop-token'); setView('browse'); };

  const openDetail = async (id) => { setDetail(await api(`/api/courses/${id}`)); setView('detail'); };
  const enroll = async (id) => {
    if (!token) { setView('auth'); return; }
    await api('/api/enrollments', { token, method: 'POST', body: { courseId: id } });
    await loadLearning(); setView('learning');
  };
  const completeLesson = async (enrollment, lessonId) => {
    const updated = await api(`/api/enrollments/${enrollment._id}/complete-lesson`, { token, method: 'POST', body: { lessonId } });
    setEnrollments((rows) => rows.map((r) => (r._id === updated._id ? updated : r)));
  };

  return (
    <div>
      <header>
        <h1>LearnLoop</h1>
        <nav>
          <button onClick={() => { setView('browse'); loadCourses(); }}>Browse</button>
          {user && <button onClick={() => { setView('learning'); loadLearning(); }}>My Learning</button>}
          {user?.role === 'instructor' && <button onClick={() => { setView('instructor'); loadMine(); }}>Teach</button>}
          {user ? <><span>{user.name} ({user.role})</span><button onClick={logout}>Log out</button></> : <button onClick={() => setView('auth')}>Sign in</button>}
        </nav>
      </header>
      {error && <p className="error">{error}</p>}
      {view === 'browse' && (
        <main>
          <h2>Browse courses</h2>
          <div className="filters">
            <input placeholder="Search courses…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option><option>Web Development</option><option>Data Science</option><option>Design</option><option>DevOps</option></select>
            <select value={level} onChange={(e) => setLevel(e.target.value)}><option value="">All levels</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select>
            <button onClick={loadCourses}>Search</button>
          </div>
          <div className="grid">
            {courses.map((c) => (
              <article key={c._id} className="card">
                <h3>{c.title}</h3>
                <p>{c.description}</p>
                <p><small>{c.category} · {c.level} · {c.lessons?.length || 0} lessons · by {c.instructor?.name || 'Instructor'}</small></p>
                <button onClick={() => openDetail(c._id)}>View course</button>
              </article>
            ))}
          </div>
          {courses.length === 0 && <p>No courses match that search yet.</p>}
        </main>
      )}
      {view === 'detail' && detail && (
        <main>
          <button onClick={() => setView('browse')}>← Back</button>
          <h2>{detail.title}</h2>
          <p>{detail.description}</p>
          <p><small>{detail.category} · {detail.level} · {detail.lessons.length} lessons · by {detail.instructor?.name}</small></p>
          <h3>Lessons</h3>
          <ol>{detail.lessons.map((l) => <li key={l._id}>{l.title} — {l.durationMinutes} min<p>{l.content}</p></li>)}</ol>
          <button onClick={() => enroll(detail._id)}>Enrol in this course</button>
        </main>
      )}
      {view === 'learning' && (
        <main>
          <h2>My Learning</h2>
          {enrollments.map((e) => (
            <article key={e._id} className="card">
              <h3>{e.course?.title}</h3>
              <div className="bar"><div style={{ width: `${e.progress}%` }} /></div>
              <p>{e.progress}% complete ({e.completedCount}/{e.totalLessons} lessons)</p>
              <ol>{e.course?.lessons.map((l) => (
                <li key={l._id}>{l.title}
                  {e.completedLessonIds.includes(String(l._id)) ? ' ✓' : <button onClick={() => completeLesson(e, String(l._id))}>Mark complete</button>}
                </li>))}</ol>
            </article>
          ))}
          {enrollments.length === 0 && <p>You are not enrolled in any course yet — browse and enrol in one.</p>}
        </main>
      )}
      {view === 'instructor' && (
        <main>
          <h2>Teach on LearnLoop</h2>
          <form onSubmit={async (ev) => { ev.preventDefault(); await api('/api/courses', { token, method: 'POST', body: courseForm }); setCourseForm({ title: '', description: '', category: 'Web Development', level: 'beginner', price: 0 }); await loadMine(); }}>
            <input placeholder="Course title" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} required />
            <textarea placeholder="Description" value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} required />
            <select value={courseForm.category} onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}><option>Web Development</option><option>Data Science</option><option>Design</option><option>DevOps</option></select>
            <select value={courseForm.level} onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select>
            <button type="submit">Create course</button>
          </form>
          <h3>My courses</h3>
          {mine.map((c) => <article key={c._id} className="card"><h4>{c.title}</h4><p>{c.lessons.length} lessons</p><button onClick={async () => { const title = prompt('Lesson title:'); if (title) { await api(`/api/courses/${c._id}/lessons`, { token, method: 'POST', body: { title } }); await loadMine(); } }}>Add lesson</button> <button onClick={async () => { await api(`/api/courses/${c._id}`, { token, method: 'DELETE' }); await loadMine(); }}>Delete</button></article>)}
        </main>
      )}
      {view === 'auth' && (
        <main>
          <h2>Sign in or create an account</h2>
          <form onSubmit={async (ev) => { ev.preventDefault(); try { saveAuth(await api('/api/auth/login', { method: 'POST', body: { email: form.email, password: form.password } })); } catch (e) { setError(e.message); } }}>
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <button type="submit">Sign in</button>
          </form>
          <form onSubmit={async (ev) => { ev.preventDefault(); try { saveAuth(await api('/api/auth/register', { method: 'POST', body: form })); } catch (e) { setError(e.message); } }}>
            <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="student">Student</option><option value="instructor">Instructor</option></select>
            <button type="submit">Create account</button>
          </form>
          <p><small>Demo instructor: demo-instructor@learnloop.example / LearnLoop123!</small></p>
        </main>
      )}
    </div>
  );
}
