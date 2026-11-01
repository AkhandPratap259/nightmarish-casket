import { useCallback, useEffect, useState } from 'react';

const API = 'http://localhost:5000/api';

function authHeaders() {
  const token = localStorage.getItem('hirehub-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const inr = (n) => (n ? `₹${Number(n).toLocaleString('en-IN')}` : '');

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hirehub-user') || 'null'); } catch { return null; }
  });
  const [view, setView] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ search: '', location: '', type: '', workMode: '' });
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [myJobs, setMyJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [applicantsFor, setApplicantsFor] = useState(null);
  const [myApplications, setMyApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());

  const loadJobs = useCallback(async () => {
    const q = new URLSearchParams({ ...filters, limit: 20 });
    const data = await api(`/jobs?${q}`);
    setJobs(data.jobs);
    setTotal(data.total);
  }, [filters]);

  useEffect(() => { loadJobs().catch((e) => setError(e.message)); }, [loadJobs]);

  const login = (data) => {
    localStorage.setItem('hirehub-token', data.token);
    localStorage.setItem('hirehub-user', JSON.stringify(data.user));
    setUser(data.user);
    setView('jobs');
    setMessage(`Signed in as ${data.user.name} (${data.user.role})`);
  };

  const logout = () => {
    localStorage.removeItem('hirehub-token');
    localStorage.removeItem('hirehub-user');
    setUser(null);
    setView('jobs');
  };

  const loadMyJobs = async () => {
    setMyJobs(await api('/jobs/mine/posted'));
    setView('my-jobs');
  };

  const loadApplicants = async (job) => {
    setApplicantsFor(job);
    setApplicants(await api(`/applications/job/${job._id}`));
    setView('applicants');
  };

  const loadMyApplications = async () => {
    setMyApplications(await api('/applications/mine'));
    setView('my-applications');
  };

  const loadSaved = async () => {
    const data = await api('/saved');
    setSavedJobs(data);
    setSavedIds(new Set(data.map((j) => j._id)));
    setView('saved');
  };

  const toggleSave = async (jobId) => {
    const res = await api(`/saved/${jobId}`, { method: 'POST' });
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (res.saved) next.add(jobId); else next.delete(jobId);
      return next;
    });
  };

  const apply = async (job, e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await api(`/applications/jobs/${job._id}/apply`, {
        method: 'POST',
        body: JSON.stringify({ coverNote: form.get('coverNote'), resumeUrl: form.get('resumeUrl') }),
      });
      setMessage(`Application sent for ${job.title}`);
    } catch (err) { setError(err.message); }
  };

  const updateStatus = async (appId, status) => {
    await api(`/applications/${appId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setApplicants((prev) => prev.map((a) => (a._id === appId ? { ...a, status } : a)));
  };

  const postJob = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const payload = Object.fromEntries(form.entries());
    try {
      await api('/jobs', { method: 'POST', body: JSON.stringify(payload) });
      setMessage('Job posted');
      loadJobs();
      setView('jobs');
    } catch (err) { setError(err.message); }
  };

  const closeJob = async (job) => {
    await api(`/jobs/${job._id}`, { method: 'PUT', body: JSON.stringify({ status: 'closed' }) });
    loadMyJobs();
  };

  const deleteJob = async (job) => {
    if (!window.confirm(`Delete "${job.title}"?`)) return;
    await api(`/jobs/${job._id}`, { method: 'DELETE' });
    loadMyJobs();
  };

  const authSubmit = async (e, mode) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      const data = await api(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      login(data);
    } catch (err) { setError(err.message); }
  };

  const jobCard = (job) => (
    <article key={job._id} className="card">
      <h3><button className="link" onClick={() => { setSelected(job); setView('detail'); }}>{job.title}</button></h3>
      <p className="muted">{job.company} · {job.location} · {job.type} · {job.workMode}</p>
      <p>{job.salaryMin || job.salaryMax ? `${inr(job.salaryMin)} – ${inr(job.salaryMax)}` : 'Salary not listed'}</p>
      <p className="muted">{(job.skills || []).join(' · ')}</p>
      {user?.role === 'candidate' && (
        <button onClick={() => toggleSave(job._id)}>{savedIds.has(job._id) ? '★ Saved' : '☆ Save'}</button>
      )}
    </article>
  );

  return (
    <div className="shell">
      <header>
        <h1>HireHub</h1>
        <nav>
          <button onClick={() => setView('jobs')}>Browse jobs</button>
          {user?.role === 'recruiter' && <button onClick={() => setView('post')}>Post a job</button>}
          {user?.role === 'recruiter' && <button onClick={loadMyJobs}>My postings</button>}
          {user?.role === 'candidate' && <button onClick={loadMyApplications}>My applications</button>}
          {user?.role === 'candidate' && <button onClick={loadSaved}>Saved jobs</button>}
          {user ? (
            <><span>{user.name} ({user.role})</span><button onClick={logout}>Log out</button></>
          ) : (
            <button onClick={() => setView('auth')}>Sign in / Register</button>
          )}
        </nav>
      </header>

      {message && <p className="ok" onClick={() => setMessage('')}>{message}</p>}
      {error && <p className="err" onClick={() => setError('')}>{error}</p>}

      {view === 'jobs' && (
        <section>
          <h2>Browse jobs ({total})</h2>
          <div className="filters">
            <input placeholder="Search title, company or skill" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            <input placeholder="Location" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} />
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
              <option value="">Any type</option><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option>
            </select>
            <select value={filters.workMode} onChange={(e) => setFilters({ ...filters, workMode: e.target.value })}>
              <option value="">Any mode</option><option>On-site</option><option>Remote</option><option>Hybrid</option>
            </select>
          </div>
          <div className="grid">{jobs.map(jobCard)}</div>
          {jobs.length === 0 && <p>No jobs match those filters yet.</p>}
        </section>
      )}

      {view === 'detail' && selected && (
        <section>
          <button onClick={() => setView('jobs')}>← Back to jobs</button>
          <h2>{selected.title}</h2>
          <p className="muted">{selected.company} · {selected.location} · {selected.type} · {selected.workMode}</p>
          <p>{selected.salaryMin || selected.salaryMax ? `${inr(selected.salaryMin)} – ${inr(selected.salaryMax)}` : 'Salary not listed'}</p>
          <p>{selected.description}</p>
          <h3>Requirements</h3>
          <ul>{(selected.requirements || []).map((r) => <li key={r}>{r}</li>)}</ul>
          <p className="muted">Skills: {(selected.skills || []).join(', ')}</p>
          {user?.role === 'candidate' && selected.status === 'open' && (
            <form onSubmit={(e) => apply(selected, e)} className="form">
              <h3>Apply</h3>
              <textarea name="coverNote" placeholder="Cover note (optional)" />
              <input name="resumeUrl" placeholder="Resume link (optional)" />
              <button type="submit">Submit application</button>
            </form>
          )}
          {user?.role === 'candidate' && selected.status !== 'open' && <p>This job is closed.</p>}
          {!user && <p>Sign in as a candidate to apply.</p>}
        </section>
      )}

      {view === 'auth' && (
        <section className="form">
          <h2>Sign in / Register</h2>
          <p className="muted">Demo recruiter: demo-recruiter@hirehub.example / HireHub123! (seeded on first server run)</p>
          <form onSubmit={(e) => authSubmit(e, 'login')}>
            <h3>Sign in</h3>
            <input name="email" type="email" placeholder="Email" required />
            <input name="password" type="password" placeholder="Password" required />
            <button type="submit">Sign in</button>
          </form>
          <form onSubmit={(e) => authSubmit(e, 'register')}>
            <h3>Register</h3>
            <input name="name" placeholder="Full name" required />
            <input name="email" type="email" placeholder="Email" required />
            <input name="password" type="password" placeholder="Password (min 6 chars)" required />
            <select name="role" required defaultValue="candidate">
              <option value="candidate">Candidate</option>
              <option value="recruiter">Recruiter</option>
            </select>
            <button type="submit">Register</button>
          </form>
        </section>
      )}

      {view === 'post' && (
        <section>
          <h2>Post a job</h2>
          <form onSubmit={postJob} className="form">
            <input name="title" placeholder="Job title" required />
            <input name="company" placeholder="Company" required />
            <input name="location" placeholder="Location" required />
            <select name="type" defaultValue="Full-time"><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select>
            <select name="workMode" defaultValue="On-site"><option>On-site</option><option>Remote</option><option>Hybrid</option></select>
            <input name="salaryMin" type="number" placeholder="Min salary (₹/year or month as listed)" />
            <input name="salaryMax" type="number" placeholder="Max salary" />
            <textarea name="description" placeholder="Description" required />
            <input name="requirements" placeholder="Requirements, comma separated" />
            <input name="skills" placeholder="Skills, comma separated" />
            <button type="submit">Publish job</button>
          </form>
        </section>
      )}

      {view === 'my-jobs' && (
        <section>
          <h2>My postings</h2>
          {myJobs.map((job) => (
            <article key={job._id} className="card">
              <h3>{job.title} — {job.status}</h3>
              <p className="muted">{job.company} · {job.location}</p>
              <button onClick={() => loadApplicants(job)}>View applicants</button>{' '}
              {job.status === 'open' && <button onClick={() => closeJob(job)}>Close job</button>}{' '}
              <button onClick={() => deleteJob(job)}>Delete</button>
            </article>
          ))}
          {myJobs.length === 0 && <p>No postings yet.</p>}
        </section>
      )}

      {view === 'applicants' && applicantsFor && (
        <section>
          <button onClick={loadMyJobs}>← Back to my postings</button>
          <h2>Applicants: {applicantsFor.title}</h2>
          {applicants.map((a) => (
            <article key={a._id} className="card">
              <p><strong>{a.candidate?.name}</strong> ({a.candidate?.email}) — {a.status}</p>
              {a.coverNote && <p>{a.coverNote}</p>}
              {a.resumeUrl && <p><a href={a.resumeUrl} target="_blank" rel="noreferrer">Resume link</a></p>}
              <select value={a.status} onChange={(e) => updateStatus(a._id, e.target.value)}>
                <option value="applied">applied</option><option value="reviewed">reviewed</option>
                <option value="shortlisted">shortlisted</option><option value="rejected">rejected</option><option value="hired">hired</option>
              </select>
            </article>
          ))}
          {applicants.length === 0 && <p>No applicants yet.</p>}
        </section>
      )}

      {view === 'my-applications' && (
        <section>
          <h2>My applications</h2>
          {myApplications.map((a) => (
            <article key={a._id} className="card">
              <h3>{a.job?.title}</h3>
              <p className="muted">{a.job?.company} · {a.job?.location} — status: {a.status}</p>
            </article>
          ))}
          {myApplications.length === 0 && <p>No applications yet.</p>}
        </section>
      )}

      {view === 'saved' && (
        <section>
          <h2>Saved jobs</h2>
          <div className="grid">{savedJobs.map(jobCard)}</div>
          {savedJobs.length === 0 && <p>No saved jobs yet.</p>}
        </section>
      )}
    </div>
  );
}
