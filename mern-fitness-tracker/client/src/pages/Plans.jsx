import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Dialog from '../components/Dialog.jsx';

export default function Plans({ user, go }) {
  const [plans, setPlans] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [weeks, setWeeks] = useState([{ weekNumber: 1, templateIds: [] }]);

  const canCreate = user && (user.role === 'trainer' || user.role === 'admin');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([api.myPlans(), api.listTemplates(true)]);
      setPlans(p.items || []);
      setTemplates(t.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleTemplate(weekIndex, templateId) {
    setWeeks((prev) =>
      prev.map((w, i) => {
        if (i !== weekIndex) return w;
        const has = w.templateIds.includes(templateId);
        return {
          ...w,
          templateIds: has
            ? w.templateIds.filter((id) => id !== templateId)
            : [...w.templateIds, templateId],
        };
      })
    );
  }

  async function create(e) {
    e.preventDefault();
    try {
      await api.createPlan({ title, description, weeks });
      setShowCreate(false);
      setTitle('');
      setDescription('');
      setWeeks([{ weekNumber: 1, templateIds: [] }]);
      setStatus('Plan created.');
      load();
    } catch (err) {
      setStatus(err.message);
    }
  }

  return (
    <section className="section">
      <p className="section-label">(09) Training plans</p>
      <h1 className="section-title">
        Weeks, <em>mapped out.</em>
      </h1>
      <p className="section-body">
        A plan is a set of weeks, each pointing at workout templates. Trainers build them
        and assign them to members; members see the plans assigned to them here.
      </p>
      {status && (
        <p className="status-note" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="page-error" role="alert">
          {error}
        </p>
      )}
      {canCreate && (
        <div className="section-actions">
          <button type="button" className="btn btn--primary" onClick={() => setShowCreate(true)}>
            New plan
          </button>
        </div>
      )}
      {loading ? (
        <p className="page-loading">Loading plans…</p>
      ) : plans.length === 0 ? (
        <p className="muted">
          {canCreate
            ? 'No plans yet — create one from your templates.'
            : 'No plans assigned to you yet. Ask your trainer to assign one.'}
        </p>
      ) : (
        <ul className="plan-list">
          {plans.map((plan) => (
            <li key={plan._id} className="plan-card">
              <div className="template-card-head">
                <h2>{plan.title}</h2>
                <span className="tag">{plan.status}</span>
              </div>
              <p className="muted">
                by {plan.trainer?.name || 'Trainer'}
                {plan.assignedTo?.length ? ` · assigned to ${plan.assignedTo.length} member${plan.assignedTo.length === 1 ? '' : 's'}` : ''}
              </p>
              {plan.description && <p>{plan.description}</p>}
              {plan.weeks.map((w) => (
                <div key={w.weekNumber} className="plan-week">
                  <h3>Week {w.weekNumber}</h3>
                  {w.templateIds.length === 0 ? (
                    <p className="muted">Rest week — no templates.</p>
                  ) : (
                    <ul>
                      {w.templateIds.map((t) => (
                        <li key={t._id}>{t.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} labelledBy="plan-create-title">
        <form className="form dialog-body dialog-body--wide" onSubmit={create}>
          <h2 id="plan-create-title">New training plan</h2>
          <div className="field">
            <label htmlFor="plan-title">Title</label>
            <input
              id="plan-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. 8-Week Strength Foundation"
            />
          </div>
          <div className="field">
            <label htmlFor="plan-desc">Description</label>
            <input
              id="plan-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Who this plan is for and how it progresses"
            />
          </div>
          {templates.length === 0 && (
            <p className="muted">
              You need at least one of your own templates before a plan can point at it.{' '}
              <button type="button" className="btn btn--ghost" onClick={() => go('templates')}>
                Build a template first
              </button>
            </p>
          )}
          {weeks.map((w, weekIndex) => (
            <fieldset key={weekIndex} className="plan-week-field">
              <legend>Week {w.weekNumber}</legend>
              {templates.map((t) => (
                <label key={t._id} className="check-row">
                  <input
                    type="checkbox"
                    checked={w.templateIds.includes(t._id)}
                    onChange={() => toggleTemplate(weekIndex, t._id)}
                  />
                  {t.name}
                </label>
              ))}
            </fieldset>
          ))}
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() =>
              setWeeks((prev) => [...prev, { weekNumber: prev.length + 1, templateIds: [] }])
            }
          >
            + Add another week
          </button>
          <div className="dialog-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Create plan
            </button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
