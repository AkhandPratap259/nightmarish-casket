import { useCallback, useEffect, useRef, useState } from 'react';
import CursorFx from './components/CursorFx.jsx';
import ResumePreview from './components/ResumePreview.jsx';
import ImproveDialog from './components/ImproveDialog.jsx';
import { TEMPLATES, TEMPLATE_IDS, STATUS_LABELS, DEMO, ENGINE_LABELS } from './data/templates.js';

const API = '/api';

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

function emptyResume(title) {
  return {
    title,
    template: 'editorial',
    status: 'draft',
    personal: { name: '', headline: '', email: '', phone: '', location: '', linkedin: '', website: '', summary: '' },
    experience: [],
    education: [],
    skills: [],
    projects: [],
  };
}

function Field({ label, value, onChange, type = 'text', textarea = false, placeholder = '', id }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {textarea ? (
        <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} />
      ) : (
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('resumeforge-token') || '');
  const [view, setView] = useState('auth');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [resumes, setResumes] = useState([]);
  const [active, setActive] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [progress, setProgress] = useState(0);
  const openerRef = useRef(null);

  const loadResumes = useCallback(
    async (tok) => {
      const list = await api('/resumes', { token: tok });
      setResumes(list);
    },
    []
  );

  useEffect(() => {
    if (!token) return;
    api('/auth/me', { token })
      .then((me) => {
        setUser(me);
        setView('dashboard');
        return loadResumes(token);
      })
      .catch(() => {
        setToken('');
        localStorage.removeItem('resumeforge-token');
      });
  }, [token, loadResumes]);

  // Scroll progress hairline + reveal-on-scroll (opacity/transform only —
  // never clip-path, so nothing stays collapsed for the observer).
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, [view, active]);

  async function handleAuth(e) {
    e.preventDefault();
    setAuthError('');
    try {
      const path = authMode === 'login' ? '/auth/login' : '/auth/register';
      const data = await api(path, { body: authForm });
      localStorage.setItem('resumeforge-token', data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setAuthError(err.message);
    }
  }

  function useDemo() {
    setAuthForm({ name: 'Demo User', email: DEMO.email, password: DEMO.password });
    setAuthMode('login');
  }

  function signOut() {
    localStorage.removeItem('resumeforge-token');
    setToken('');
    setUser(null);
    setActive(null);
    setAnalysis(null);
    setView('auth');
  }

  async function createResume(e) {
    e.preventDefault();
    const title = newTitle.trim() || 'Untitled resume';
    try {
      const created = await api('/resumes', { method: 'POST', body: emptyResume(title), token });
      setResumes((r) => [created, ...r]);
      setActive(created);
      setAnalysis(null);
      setNewTitle('');
      setView('editor');
    } catch (err) {
      setSaveStatus(err.message);
    }
  }

  async function openResume(id) {
    try {
      const r = await api(`/resumes/${id}`, { token });
      setActive(r);
      setAnalysis(null);
      setView('editor');
      window.scrollTo(0, 0);
    } catch (err) {
      setSaveStatus(err.message);
    }
  }

  async function saveResume() {
    if (!active) return;
    setSaveStatus('Saving…');
    try {
      const saved = await api(`/resumes/${active._id}`, { method: 'PUT', body: active, token });
      setActive(saved);
      setResumes((r) => r.map((x) => (x._id === saved._id ? saved : x)));
      setSaveStatus('Saved.');
    } catch (err) {
      setSaveStatus(`Save failed: ${err.message}`);
    }
  }

  async function deleteResume(id) {
    if (!window.confirm('Delete this resume? This cannot be undone.')) return;
    try {
      await api(`/resumes/${id}`, { method: 'DELETE', token });
      setResumes((r) => r.filter((x) => x._id !== id));
    } catch (err) {
      setSaveStatus(err.message);
    }
  }

  async function runAnalysis() {
    if (!active) return;
    setAnalyzing(true);
    setSaveStatus('');
    try {
      const result = await api(`/resumes/${active._id}/analyze`, {
        method: 'POST',
        body: { jobDescription },
        token,
      });
      setAnalysis(result);
    } catch (err) {
      setSaveStatus(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function improveBullet(expIndex, bulletIndex, bullet) {
    openerRef.current = document.activeElement;
    try {
      const result = await api(`/resumes/${active._id}/improve`, {
        method: 'POST',
        body: { bullets: [bullet] },
        token,
      });
      const r = result.results[0];
      setDialog({ expIndex, bulletIndex, original: r.original, improved: r.improved, notes: r.notes, engine: result.engine });
    } catch (err) {
      setSaveStatus(err.message);
    }
  }

  function applyImprovement() {
    if (!dialog || !active) return;
    const next = { ...active };
    next.experience = active.experience.map((exp, i) =>
      i !== dialog.expIndex
        ? exp
        : { ...exp, bullets: exp.bullets.map((b, j) => (j === dialog.bulletIndex ? dialog.improved : b)) }
    );
    setActive(next);
    setSaveStatus('Improvement applied — press Save to keep it.');
    closeDialog();
  }

  function closeDialog() {
    setDialog(null);
    if (openerRef.current && openerRef.current.focus) openerRef.current.focus();
  }

  async function exportJson() {
    if (!active) return;
    const res = await fetch(`${API}/resumes/${active._id}/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setSaveStatus('Export failed.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(active.title || 'resume').replace(/[^a-z0-9-_]+/gi, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSaveStatus('JSON downloaded — it is byte-identical to the stored resume.');
  }

  function updatePersonal(field, value) {
    setActive((a) => ({ ...a, personal: { ...a.personal, [field]: value } }));
  }
  function updateExp(i, field, value) {
    setActive((a) => ({ ...a, experience: a.experience.map((e, j) => (j === i ? { ...e, [field]: value } : e)) }));
  }
  function updateBullet(i, j, value) {
    setActive((a) => ({
      ...a,
      experience: a.experience.map((e, k) =>
        k === i ? { ...e, bullets: e.bullets.map((b, m) => (m === j ? value : b)) } : e
      ),
    }));
  }
  function updateEdu(i, field, value) {
    setActive((a) => ({ ...a, education: a.education.map((e, j) => (j === i ? { ...e, [field]: value } : e)) }));
  }
  function updateProj(i, field, value) {
    setActive((a) => ({ ...a, projects: a.projects.map((p, j) => (j === i ? { ...p, [field]: value } : p)) }));
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <CursorFx />
      <header className="topbar">
        <div className="topbar-inner">
          <button className="brand" type="button" onClick={() => (user ? setView('dashboard') : setView('auth'))}>
            <span className="brand-mark" aria-hidden="true">
              R
            </span>
            ResumeForge
          </button>
          <nav aria-label="Primary">
            {user && (
              <>
                <button type="button" onClick={() => setView('dashboard')}>
                  My resumes
                </button>
                {active && (
                  <button type="button" onClick={() => setView('editor')}>
                    Editor
                  </button>
                )}
              </>
            )}
            <a href="#main">How it works</a>
          </nav>
          {user ? (
            <button className="btn btn-primary" type="button" onClick={signOut}>
              Sign out
            </button>
          ) : (
            <button className="btn btn-primary" type="button" onClick={() => setView('auth')}>
              Sign in
            </button>
          )}
        </div>
        <div className="scroll-progress" style={{ width: `${progress}%` }} aria-hidden="true" />
      </header>

      <main id="main">
        {view === 'auth' && !user && (
          <section className="auth-split" aria-labelledby="auth-heading">
            <div className="auth-left">
              <p className="eyebrow">(01) ResumeForge — AI resume builder</p>
              <h1 id="auth-heading">
                A resume that reads like <em>you</em> did the work.
              </h1>
              <p className="lede">
                Edit, preview in three editorial templates, check an honest ATS-style score, and improve every bullet —
                with an optional AI layer and a working fallback. No key required.
              </p>
              <form className="auth-form" onSubmit={handleAuth} aria-label="Sign in or register">
                <div className="auth-tabs" role="group" aria-label="Account mode">
                  <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
                    Sign in
                  </button>
                  <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>
                    Register
                  </button>
                </div>
                {authMode === 'register' && (
                  <Field id="auth-name" label="Your name" value={authForm.name} onChange={(v) => setAuthForm({ ...authForm, name: v })} />
                )}
                <Field id="auth-email" label="Email" type="email" value={authForm.email} onChange={(v) => setAuthForm({ ...authForm, email: v })} />
                <Field id="auth-password" label="Password" type="password" value={authForm.password} onChange={(v) => setAuthForm({ ...authForm, password: v })} />
                {authError && (
                  <p className="form-error" role="alert">
                    {authError}
                  </p>
                )}
                <button className="btn btn-primary btn-block" type="submit">
                  {authMode === 'login' ? 'Sign in' : 'Create account'}
                </button>
                <button className="btn btn-ghost btn-block" type="button" onClick={useDemo}>
                  Use the demo account
                </button>
                <p className="fineprint">
                  Demo: {DEMO.email} / {DEMO.password}. Your own account keeps its resumes private to you.
                </p>
              </form>
            </div>
            <div className="auth-right" aria-label="Illustrative preview of a resume">
              <p className="vertical-label" aria-hidden="true">
                Selected work — sample
              </p>
              <div className="mockup" aria-hidden="true">
                <div className="mockup-bar">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="mockup-body">
                  <div className="sk sk-name" />
                  <div className="sk sk-line short" />
                  <div className="sk sk-line" />
                  <div className="sk sk-line" />
                  <div className="sk sk-line med" />
                  <div className="sk sk-rule" />
                  <div className="sk sk-line" />
                  <div className="sk sk-line med" />
                </div>
              </div>
              <p className="mockup-caption">Illustrative preview — the sample resume is fictional data, for trying the editor.</p>
            </div>
          </section>
        )}

        {view === 'dashboard' && user && (
          <section className="dashboard" aria-labelledby="dash-heading">
            <div className="dash-head reveal">
              <p className="eyebrow">(01) Your resumes</p>
              <h1 id="dash-heading">
                Every resume, <em>one</em> honest score.
              </h1>
              <p className="lede">Pick one up, or start a new one. Scores come from the content itself — never invented.</p>
            </div>
            <form className="new-resume reveal" onSubmit={createResume}>
              <label htmlFor="new-title">New resume title</label>
              <input id="new-title" type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Fresher SDE — 2026" />
              <button className="btn btn-primary" type="submit">
                Create resume
              </button>
            </form>
            {resumes.length === 0 ? (
              <p className="empty-state">No resumes yet. Create your first one above — or sign in with the demo account to see a sample.</p>
            ) : (
              <ul className="resume-index">
                {resumes.map((r, i) => (
                  <li key={r._id} className="resume-row reveal">
                    <span className="index-num" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="row-main">
                      <h2>{r.title}</h2>
                      <p>
                        {TEMPLATES[r.template]?.label || r.template} template · Updated{' '}
                        {new Date(r.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`status-pill ${r.status}`}>{STATUS_LABELS[r.status] || r.status}</span>
                    <div className="row-actions">
                      <button className="btn btn-primary" type="button" onClick={() => openResume(r._id)}>
                        Open
                      </button>
                      <button className="btn btn-ghost" type="button" onClick={() => deleteResume(r._id)}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="save-status" role="status" aria-live="polite">
              {saveStatus}
            </p>
          </section>
        )}

        {view === 'editor' && active && (
          <section className="editor" aria-labelledby="editor-heading">
            <div className="editor-toolbar">
              <div>
                <p className="eyebrow">(02) Editor — {active.template} template</p>
                <h1 id="editor-heading">{active.title}</h1>
              </div>
              <div className="toolbar-actions">
                <button className="btn btn-ghost" type="button" onClick={() => setView('dashboard')}>
                  ← All resumes
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => setActive((a) => ({ ...a, status: a.status === 'ready' ? 'draft' : 'ready' }))}
                >
                  {active.status === 'ready' ? 'Back to draft' : 'Mark as ready'}
                </button>
                <button className="btn btn-ghost" type="button" onClick={exportJson}>
                  Download JSON
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => window.print()}>
                  Print / PDF
                </button>
                <button className="btn btn-primary" type="button" onClick={saveResume}>
                  Save resume
                </button>
              </div>
            </div>
            <p className="save-status" role="status" aria-live="polite">
              {saveStatus}
            </p>

            <div className="editor-grid">
              <div className="editor-form">
                <div className="form-section reveal">
                  <h2>
                    <span className="sec-num">(01)</span> Personal
                  </h2>
                  <Field id="p-name" label="Full name" value={active.personal.name} onChange={(v) => updatePersonal('name', v)} />
                  <Field id="p-headline" label="Headline / target role" value={active.personal.headline} onChange={(v) => updatePersonal('headline', v)} />
                  <div className="field-row">
                    <Field id="p-email" label="Email" type="email" value={active.personal.email} onChange={(v) => updatePersonal('email', v)} />
                    <Field id="p-phone" label="Phone" value={active.personal.phone} onChange={(v) => updatePersonal('phone', v)} />
                  </div>
                  <div className="field-row">
                    <Field id="p-location" label="Location" value={active.personal.location} onChange={(v) => updatePersonal('location', v)} />
                    <Field id="p-linkedin" label="LinkedIn" value={active.personal.linkedin} onChange={(v) => updatePersonal('linkedin', v)} />
                  </div>
                  <Field id="p-website" label="Website / GitHub" value={active.personal.website} onChange={(v) => updatePersonal('website', v)} />
                  <Field id="p-summary" label="Summary" textarea value={active.personal.summary} onChange={(v) => updatePersonal('summary', v)} placeholder="30–60 words: what you do, your strongest proof, what you want next." />
                </div>

                <div className="form-section reveal">
                  <h2>
                    <span className="sec-num">(02)</span> Experience
                  </h2>
                  {active.experience.map((exp, i) => (
                    <div className="sub-block" key={i}>
                      <div className="field-row">
                        <Field id={`exp-role-${i}`} label="Role" value={exp.role} onChange={(v) => updateExp(i, 'role', v)} />
                        <Field id={`exp-company-${i}`} label="Company" value={exp.company} onChange={(v) => updateExp(i, 'company', v)} />
                      </div>
                      <div className="field-row">
                        <Field id={`exp-start-${i}`} label="Start" value={exp.start} onChange={(v) => updateExp(i, 'start', v)} placeholder="Jun 2025" />
                        <Field id={`exp-end-${i}`} label="End" value={exp.end} onChange={(v) => updateExp(i, 'end', v)} placeholder="Aug 2025" />
                      </div>
                      <label className="check-row">
                        <input type="checkbox" checked={exp.current} onChange={(e) => updateExp(i, 'current', e.target.checked)} /> I currently work here
                      </label>
                      {exp.bullets.map((b, j) => (
                        <div className="bullet-row" key={j}>
                          <Field
                            id={`exp-bullet-${i}-${j}`}
                            label={`Bullet ${j + 1}`}
                            textarea
                            value={b}
                            onChange={(v) => updateBullet(i, j, v)}
                          />
                          <div className="bullet-actions">
                            <button className="btn btn-ghost btn-small" type="button" onClick={() => improveBullet(i, j, b)}>
                              Improve
                            </button>
                            <button
                              className="btn btn-ghost btn-small"
                              type="button"
                              onClick={() => updateExp(i, 'bullets', exp.bullets.filter((_, m) => m !== j))}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      <button className="btn btn-ghost btn-small" type="button" onClick={() => updateExp(i, 'bullets', [...exp.bullets, ''])}>
                        + Add bullet
                      </button>
                      <button
                        className="btn btn-ghost btn-small"
                        type="button"
                        onClick={() => setActive((a) => ({ ...a, experience: a.experience.filter((_, k) => k !== i) }))}
                      >
                        Remove role
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    onClick={() =>
                      setActive((a) => ({
                        ...a,
                        experience: [...a.experience, { role: '', company: '', start: '', end: '', current: false, bullets: [''] }],
                      }))
                    }
                  >
                    + Add role
                  </button>
                </div>

                <div className="form-section reveal">
                  <h2>
                    <span className="sec-num">(03)</span> Education
                  </h2>
                  {active.education.map((edu, i) => (
                    <div className="sub-block" key={i}>
                      <div className="field-row">
                        <Field id={`edu-degree-${i}`} label="Degree" value={edu.degree} onChange={(v) => updateEdu(i, 'degree', v)} />
                        <Field id={`edu-school-${i}`} label="Institution" value={edu.school} onChange={(v) => updateEdu(i, 'school', v)} />
                      </div>
                      <div className="field-row">
                        <Field id={`edu-start-${i}`} label="Start" value={edu.start} onChange={(v) => updateEdu(i, 'start', v)} />
                        <Field id={`edu-end-${i}`} label="End" value={edu.end} onChange={(v) => updateEdu(i, 'end', v)} />
                      </div>
                      <Field id={`edu-details-${i}`} label="Details" value={edu.details} onChange={(v) => updateEdu(i, 'details', v)} placeholder="CGPA, coursework, honours" />
                      <button
                        className="btn btn-ghost btn-small"
                        type="button"
                        onClick={() => setActive((a) => ({ ...a, education: a.education.filter((_, k) => k !== i) }))}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    onClick={() =>
                      setActive((a) => ({ ...a, education: [...a.education, { degree: '', school: '', start: '', end: '', details: '' }] }))
                    }
                  >
                    + Add education
                  </button>
                </div>

                <div className="form-section reveal">
                  <h2>
                    <span className="sec-num">(04)</span> Skills &amp; projects
                  </h2>
                  <Field
                    id="skills"
                    label="Skills (comma separated)"
                    value={active.skills.join(', ')}
                    onChange={(v) => setActive((a) => ({ ...a, skills: v.split(',').map((s) => s.trim()).filter(Boolean) }))}
                    placeholder="React, Node.js, MongoDB"
                  />
                  {active.projects.map((proj, i) => (
                    <div className="sub-block" key={i}>
                      <div className="field-row">
                        <Field id={`proj-name-${i}`} label="Project name" value={proj.name} onChange={(v) => updateProj(i, 'name', v)} />
                        <Field id={`proj-link-${i}`} label="Link" value={proj.link} onChange={(v) => updateProj(i, 'link', v)} placeholder="github.com/you/project" />
                      </div>
                      <Field id={`proj-desc-${i}`} label="Description" textarea value={proj.description} onChange={(v) => updateProj(i, 'description', v)} />
                      <Field
                        id={`proj-tags-${i}`}
                        label="Tags (comma separated)"
                        value={proj.tags.join(', ')}
                        onChange={(v) => updateProj(i, 'tags', v.split(',').map((s) => s.trim()).filter(Boolean))}
                      />
                      <button
                        className="btn btn-ghost btn-small"
                        type="button"
                        onClick={() => setActive((a) => ({ ...a, projects: a.projects.filter((_, k) => k !== i) }))}
                      >
                        Remove project
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    onClick={() => setActive((a) => ({ ...a, projects: [...a.projects, { name: '', link: '', description: '', tags: [] }] }))}
                  >
                    + Add project
                  </button>
                </div>
              </div>

              <div className="preview-col">
                <div className="template-switch" role="group" aria-label="Resume template">
                  {TEMPLATE_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={active.template === id ? 'active' : ''}
                      aria-pressed={active.template === id}
                      onClick={() => setActive((a) => ({ ...a, template: id }))}
                    >
                      {TEMPLATES[id].label}
                    </button>
                  ))}
                </div>
                <p className="template-blurb">{TEMPLATES[active.template].blurb}</p>
                <div className="print-area">
                  <ResumePreview resume={active} />
                </div>

                <div className="ats-panel reveal">
                  <h2>
                    <span className="sec-num">(05)</span> ATS-style check
                  </h2>
                  <p>Rule-based, from your content only. Paste a job description to check keyword coverage too.</p>
                  <label htmlFor="job-desc">Job description (optional)</label>
                  <textarea
                    id="job-desc"
                    rows={4}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here…"
                  />
                  <button className="btn btn-primary" type="button" onClick={runAnalysis} disabled={analyzing}>
                    {analyzing ? 'Checking…' : 'Run ATS check'}
                  </button>
                  {analysis && (
                    <div className="analysis" aria-live="polite">
                      <div className="score-wrap">
                        <svg className="score-ring" viewBox="0 0 120 120" role="img" aria-label={`ATS score ${analysis.score} out of 100`}>
                          <circle cx="60" cy="60" r="52" className="ring-track" />
                          <circle
                            cx="60"
                            cy="60"
                            r="52"
                            className="ring-value"
                            strokeDasharray={`${(analysis.score / 100) * 326.7} 326.7`}
                          />
                          <text x="60" y="66" textAnchor="middle" className="ring-text">
                            {analysis.score}
                          </text>
                        </svg>
                        <div>
                          <p className="score-label">Score / 100</p>
                          <p className="score-note">{analysis.totalWords} words in total.</p>
                          {analysis.keywords && (
                            <p className="score-note">
                              Keyword coverage: {analysis.keywords.coverage}% ({analysis.keywords.matched}/{analysis.keywords.total} keywords from the job
                              description).
                            </p>
                          )}
                        </div>
                      </div>
                      <ul className="check-list">
                        {analysis.checks.map((c) => (
                          <li key={c.label} className={c.pass ? 'pass' : 'fail'}>
                            <span aria-hidden="true">{c.pass ? '✓' : '×'}</span> {c.label} — {c.detail}
                          </li>
                        ))}
                      </ul>
                      {analysis.suggestions.length > 0 && (
                        <>
                          <h3>What to fix</h3>
                          <ul className="suggestion-list">
                            {analysis.suggestions.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <p>
            <strong>ResumeForge</strong> — build it honest, ship it ready.
          </p>
          <p>Scores and suggestions are computed from your content. The AI layer is optional; the rule-based improver always works.</p>
          <p>© {new Date().getFullYear()} ResumeForge</p>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Back to top ↑
          </button>
        </div>
      </footer>

      {dialog && (
        <ImproveDialog
          dialog={dialog}
          engineLabel={ENGINE_LABELS[dialog.engine] || dialog.engine}
          onApply={applyImprovement}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
