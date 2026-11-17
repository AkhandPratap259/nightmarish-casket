import { useState } from 'react';
import { api } from '../api';
import { CATEGORIES } from '../data/config';

function blankReward() {
  return { title: '', amount: '', description: '', quantity: '' };
}
function blankStretch() {
  return { amount: '', title: '' };
}

export default function CreateCampaign({ user, onGo, onRequireAuth, notify }) {
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [story, setStory] = useState('');
  const [category, setCategory] = useState('technology');
  const [goal, setGoal] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [minimumPledge, setMinimumPledge] = useState('100');
  const [rewards, setRewards] = useState([blankReward()]);
  const [stretchGoals, setStretchGoals] = useState([blankStretch()]);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <div className="page">
        <p className="section-label">Start a campaign</p>
        <h1>Start a campaign</h1>
        <p className="page-sub">You need to be signed in to launch a campaign.</p>
        <button type="button" className="btn btn-primary" onClick={onRequireAuth}>
          Sign in to continue
        </button>
      </div>
    );
  }

  if (user.role !== 'creator' && user.role !== 'admin') {
    return (
      <div className="page">
        <p className="section-label">Start a campaign</p>
        <h1>Start a campaign</h1>
        <p className="page-sub">
          Only creators can launch campaigns. You are signed in as a backer — register a creator account to start one.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => onGo({ name: 'dashboard' })}>
          Go to my dashboard
        </button>
      </div>
    );
  }

  function updateReward(i, field, value) {
    setRewards((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }
  function updateStretch(i, field, value) {
    setStretchGoals((gs) => gs.map((g, idx) => (idx === i ? { ...g, [field]: value } : g)));
  }

  function validate() {
    const errs = {};
    if (!title.trim()) errs.title = 'A title is required.';
    if (!tagline.trim()) errs.tagline = 'A one-line tagline is required.';
    if (!story.trim()) errs.story = 'Tell the story of your campaign.';
    if (!goal || Number(goal) < 1000) errs.goal = 'Goal must be at least ₹1,000.';
    if (!endsAt) errs.endsAt = 'Pick an end date.';
    else if (new Date(endsAt).getTime() <= Date.now()) errs.endsAt = 'The end date must be in the future.';
    if (!minimumPledge || Number(minimumPledge) < 1) errs.minimumPledge = 'Minimum pledge must be at least ₹1.';
    rewards.forEach((r, i) => {
      if (!r.title && !r.amount && !r.description && !r.quantity) return; // empty row is skipped
      if (!r.title.trim()) errs[`reward-${i}-title`] = 'Reward title is required.';
      if (!r.amount || Number(r.amount) < 1) errs[`reward-${i}-amount`] = 'Reward amount must be at least ₹1.';
      if (r.amount && Number(r.amount) < Number(minimumPledge || 1)) {
        errs[`reward-${i}-amount`] = 'Reward amount cannot be below the minimum pledge.';
      }
    });
    stretchGoals.forEach((g, i) => {
      if (!g.title && !g.amount) return;
      if (!g.title.trim()) errs[`stretch-${i}-title`] = 'Stretch goal title is required.';
      if (!g.amount || Number(g.amount) <= Number(goal || 0)) {
        errs[`stretch-${i}-amount`] = 'Stretch goal amount must be above the funding goal.';
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    setStatus('');
    if (!validate()) {
      setStatus('Please fix the errors below before submitting.');
      return;
    }
    setBusy(true);
    try {
      const cleanRewards = rewards
        .filter((r) => r.title.trim() && r.amount)
        .map((r) => ({
          title: r.title.trim(),
          amount: Number(r.amount),
          description: r.description.trim(),
          quantity: r.quantity === '' ? undefined : Number(r.quantity),
        }));
      const cleanStretch = stretchGoals
        .filter((g) => g.title.trim() && g.amount)
        .map((g) => ({ title: g.title.trim(), amount: Number(g.amount) }));
      const res = await api.createCampaign({
        title: title.trim(),
        tagline: tagline.trim(),
        story: story.trim(),
        category,
        goal: Number(goal),
        endsAt: new Date(endsAt).toISOString(),
        minimumPledge: Number(minimumPledge),
        rewards: cleanRewards,
        stretchGoals: cleanStretch,
      });
      const created = res.campaign || res;
      notify('Draft campaign created. Publish when ready.', 'success');
      onGo({ name: 'campaign', id: created._id, hint: 'publish' });
    } catch (err) {
      setStatus(err.message || 'Could not create the campaign.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page create-page">
      <p className="section-label">Start a campaign</p>
      <h1>Launch your <em>idea.</em></h1>
      <p className="page-sub">
        Your campaign is saved as a draft first — publish it from the campaign page when it is ready.
        Pledges on FundForge are mock only; no real money moves.
      </p>

      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="cc-title">Campaign title</label>
          <input id="cc-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!errors.title} />
          {errors.title ? <p className="form-error" role="alert">{errors.title}</p> : null}
        </div>
        <div className="field">
          <label htmlFor="cc-tagline">Tagline — one line</label>
          <input id="cc-tagline" type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} aria-invalid={!!errors.tagline} />
          {errors.tagline ? <p className="form-error" role="alert">{errors.tagline}</p> : null}
        </div>
        <div className="field">
          <label htmlFor="cc-story">Story</label>
          <textarea id="cc-story" rows={6} value={story} onChange={(e) => setStory(e.target.value)} aria-invalid={!!errors.story} />
          {errors.story ? <p className="form-error" role="alert">{errors.story}</p> : null}
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="cc-category">Category</label>
            <select id="cc-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cc-goal">Funding goal (₹)</label>
            <input id="cc-goal" type="number" min="1000" step="100" value={goal} onChange={(e) => setGoal(e.target.value)} aria-invalid={!!errors.goal} />
            {errors.goal ? <p className="form-error" role="alert">{errors.goal}</p> : null}
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="cc-ends">End date</label>
            <input id="cc-ends" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} aria-invalid={!!errors.endsAt} />
            {errors.endsAt ? <p className="form-error" role="alert">{errors.endsAt}</p> : null}
          </div>
          <div className="field">
            <label htmlFor="cc-min">Minimum pledge (₹)</label>
            <input id="cc-min" type="number" min="1" step="1" value={minimumPledge} onChange={(e) => setMinimumPledge(e.target.value)} aria-invalid={!!errors.minimumPledge} />
            {errors.minimumPledge ? <p className="form-error" role="alert">{errors.minimumPledge}</p> : null}
          </div>
        </div>

        <fieldset className="dynamic-group">
          <legend>Reward tiers</legend>
          <p className="hint-text">Leave a row blank to skip it. Leave quantity empty for unlimited rewards.</p>
          {rewards.map((r, i) => (
            <div key={i} className="dynamic-row">
              <div className="field">
                <label htmlFor={`reward-${i}-title`}>Title</label>
                <input id={`reward-${i}-title`} type="text" value={r.title} onChange={(e) => updateReward(i, 'title', e.target.value)} />
                {errors[`reward-${i}-title`] ? <p className="form-error" role="alert">{errors[`reward-${i}-title`]}</p> : null}
              </div>
              <div className="field">
                <label htmlFor={`reward-${i}-amount`}>Amount (₹)</label>
                <input id={`reward-${i}-amount`} type="number" min="1" step="1" value={r.amount} onChange={(e) => updateReward(i, 'amount', e.target.value)} />
                {errors[`reward-${i}-amount`] ? <p className="form-error" role="alert">{errors[`reward-${i}-amount`]}</p> : null}
              </div>
              <div className="field">
                <label htmlFor={`reward-${i}-desc`}>Description</label>
                <input id={`reward-${i}-desc`} type="text" value={r.description} onChange={(e) => updateReward(i, 'description', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor={`reward-${i}-qty`}>Quantity (blank = unlimited)</label>
                <input id={`reward-${i}-qty`} type="number" min="1" step="1" value={r.quantity} onChange={(e) => updateReward(i, 'quantity', e.target.value)} />
              </div>
              <button type="button" className="btn btn-ghost btn-small" disabled={rewards.length <= 1} onClick={() => setRewards((rs) => rs.filter((_, idx) => idx !== i))} aria-label={`Remove reward tier ${i + 1}`}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setRewards((rs) => [...rs, blankReward()])}>
            + Add reward tier
          </button>
        </fieldset>

        <fieldset className="dynamic-group">
          <legend>Stretch goals</legend>
          <p className="hint-text">Optional goals above your funding goal. Leave a row blank to skip it.</p>
          {stretchGoals.map((g, i) => (
            <div key={i} className="dynamic-row stretch-row">
              <div className="field">
                <label htmlFor={`stretch-${i}-amount`}>Amount (₹)</label>
                <input id={`stretch-${i}-amount`} type="number" min="1" step="100" value={g.amount} onChange={(e) => updateStretch(i, 'amount', e.target.value)} />
                {errors[`stretch-${i}-amount`] ? <p className="form-error" role="alert">{errors[`stretch-${i}-amount`]}</p> : null}
              </div>
              <div className="field">
                <label htmlFor={`stretch-${i}-title`}>Title</label>
                <input id={`stretch-${i}-title`} type="text" value={g.title} onChange={(e) => updateStretch(i, 'title', e.target.value)} />
                {errors[`stretch-${i}-title`] ? <p className="form-error" role="alert">{errors[`stretch-${i}-title`]}</p> : null}
              </div>
              <button type="button" className="btn btn-ghost btn-small" disabled={stretchGoals.length <= 1} onClick={() => setStretchGoals((gs) => gs.filter((_, idx) => idx !== i))} aria-label={`Remove stretch goal ${i + 1}`}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setStretchGoals((gs) => [...gs, blankStretch()])}>
            + Add stretch goal
          </button>
        </fieldset>

        {status ? (
          <p className={Object.keys(errors).length ? 'form-error' : 'empty-note'} role="status" aria-live="polite">{status}</p>
        ) : null}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create draft campaign'}
        </button>
      </form>
    </div>
  );
}
