import { useCallback, useEffect, useRef, useState } from 'react';
import {
  api,
  formatDate,
  formatDateShort,
  inr,
  ACTIVITY_CATEGORIES,
  EXPENSE_CATEGORIES,
  PACKING_CATEGORIES,
} from '../api.js';
import { COVER_LABELS } from '../data/config.js';
import Dialog from './Dialog.jsx';
import PackingRing from './PackingRing.jsx';
import { getSocket } from '../App.jsx';

function categoryLabel(c) {
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function daysUntil(dateIso) {
  const d = Math.ceil((new Date(dateIso) - Date.now()) / 86400000);
  if (d < 0) return 'Departed';
  if (d === 0) return 'Departs today';
  return `${d} day${d === 1 ? '' : 's'} to go`;
}

function ActivityForm({ tripId, dayIndex, initial, onClose, onSaved }) {
  const [form, setForm] = useState(
    initial || { title: '', category: 'sightseeing', startTime: '09:00', endTime: '10:00', cost: '', notes: '' }
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.startTime || !form.endTime) {
      setError('Title, start time and end time are required.');
      return;
    }
    if (form.endTime <= form.startTime) {
      setError('End time must be after start time.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        dayIndex,
        title: form.title.trim(),
        category: form.category,
        startTime: form.startTime,
        endTime: form.endTime,
        cost: Number(form.cost) || 0,
        notes: form.notes || '',
      };
      if (initial) await api.updateActivity(tripId, initial._id, payload);
      else await api.addActivity(tripId, payload);
      onSaved();
    } catch (err) {
      // Server-side clash detection lands here as a plain message.
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={submit} noValidate>
      <div className="form-grid">
        <label className="field field-wide">
          <span>Activity *</span>
          <input value={form.title} onChange={set('title')} placeholder="e.g. Amber Fort visit" autoFocus />
        </label>
        <label className="field">
          <span>Category</span>
          <select value={form.category} onChange={set('category')}>
            {ACTIVITY_CATEGORIES.map((c) => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Planned cost (₹)</span>
          <input type="number" min="0" value={form.cost} onChange={set('cost')} placeholder="0" />
        </label>
        <label className="field">
          <span>Start time *</span>
          <input type="time" value={form.startTime} onChange={set('startTime')} />
        </label>
        <label className="field">
          <span>End time *</span>
          <input type="time" value={form.endTime} onChange={set('endTime')} />
        </label>
        <label className="field field-wide">
          <span>Notes</span>
          <textarea value={form.notes} onChange={set('notes')} rows="2" />
        </label>
      </div>
      {error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : null}
      <div className="dialog-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : initial ? 'Save changes' : 'Add activity'}
        </button>
      </div>
    </form>
  );
}

export default function TripDetail({ tripId, onBack, onChanged, currentUser }) {
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [liveNote, setLiveNote] = useState('');
  const [dayIndex, setDayIndex] = useState(0);
  const [showActivity, setShowActivity] = useState(null); // null | 'new' | activity object
  const [showExpense, setShowExpense] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ title: '', category: 'food', amount: '' });
  const [expenseError, setExpenseError] = useState('');
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'viewer' });
  const [inviteError, setInviteError] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  const [packingLabel, setPackingLabel] = useState('');
  const [packingCategory, setPackingCategory] = useState('other');
  const dragId = useRef(null);

  const load = useCallback(async () => {
    try {
      const [detail, stats] = await Promise.all([api.trip(tripId), api.analytics(tripId)]);
      setData(detail);
      setAnalytics(stats);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates: join the trip room and refetch when a collaborator changes it.
  useEffect(() => {
    const s = getSocket();
    if (!s) return undefined;
    s.emit('watch-trip', tripId);
    const onChange = (payload) => {
      load();
      const who = payload?.activity?.title || payload?.expense?.title || 'A collaborator';
      setLiveNote(`${who} — this trip was updated live.`);
      window.setTimeout(() => setLiveNote(''), 5000);
    };
    s.on('activity:created', onChange);
    s.on('activity:updated', onChange);
    s.on('activity:deleted', onChange);
    s.on('activity:reordered', onChange);
    s.on('expense:created', onChange);
    s.on('expense:updated', onChange);
    s.on('expense:deleted', onChange);
    s.on('packing:updated', onChange);
    s.on('trip:updated', onChange);
    s.on('trip:collaborator', onChange);
    return () => {
      s.emit('unwatch-trip', tripId);
      s.off('activity:created', onChange);
      s.off('activity:updated', onChange);
      s.off('activity:deleted', onChange);
      s.off('activity:reordered', onChange);
      s.off('expense:created', onChange);
      s.off('expense:updated', onChange);
      s.off('expense:deleted', onChange);
      s.off('packing:updated', onChange);
      s.off('trip:updated', onChange);
      s.off('trip:collaborator', onChange);
    };
  }, [tripId, load]);

  if (error) {
    return (
      <main id="main" className="trip-detail">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Back to trips</button>
        <p className="form-error" role="alert">{error}</p>
      </main>
    );
  }
  if (!data) {
    return (
      <main id="main" className="trip-detail">
        <p>Loading trip…</p>
      </main>
    );
  }

  const { trip, days, packing, summary, canEdit, isOwner } = data;
  const day = days[Math.min(dayIndex, days.length - 1)] || days[0];
  const usedPct = trip.budget > 0 ? Math.min(100, Math.round((summary.totalCost / trip.budget) * 100)) : 0;
  const maxDayTotal = analytics ? Math.max(1, ...analytics.perDay.map((d) => d.total)) : 1;

  async function handleReorder(e) {
    e.preventDefault();
    if (!dragId.current || !canEdit) return;
    const ids = day.activities.map((a) => a._id);
    const from = ids.indexOf(dragId.current);
    if (from === -1) return;
    const target = e.currentTarget.dataset.activityId;
    const to = target ? ids.indexOf(target) : ids.length - 1;
    if (from === to) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId.current);
    try {
      await api.reorderActivities(tripId, { dayIndex: day.index, orderedIds: next });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addExpense(e) {
    e.preventDefault();
    setExpenseError('');
    if (!expenseForm.title.trim() || expenseForm.amount === '' || Number(expenseForm.amount) < 0) {
      setExpenseError('Title and a non-negative amount are required.');
      return;
    }
    try {
      await api.addExpense(tripId, {
        dayIndex: day.index,
        title: expenseForm.title.trim(),
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
      });
      setExpenseForm({ title: '', category: 'food', amount: '' });
      setShowExpense(false);
      load();
    } catch (err) {
      setExpenseError(err.message);
    }
  }

  async function invite(e) {
    e.preventDefault();
    setInviteError('');
    setInviteStatus('');
    if (!inviteForm.email.includes('@')) {
      setInviteError('Enter a valid email address.');
      return;
    }
    try {
      await api.invite(tripId, inviteForm);
      setInviteStatus(`${inviteForm.email} added as ${inviteForm.role}.`);
      setInviteForm({ email: '', role: 'viewer' });
      load();
      onChanged();
    } catch (err) {
      setInviteError(err.message);
    }
  }

  async function addPacking(e) {
    e.preventDefault();
    if (!packingLabel.trim()) return;
    try {
      await api.addPacking(tripId, { label: packingLabel.trim(), category: packingCategory });
      setPackingLabel('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main id="main" className="trip-detail">
      <div className="trip-topbar">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← All trips</button>
        {liveNote ? (
          <p className="live-note" role="status" aria-live="polite">● {liveNote}</p>
        ) : null}
      </div>

      <section className={`trip-hero cover-${trip.coverStyle}`} aria-label="Trip overview">
        <div className="trip-hero-text">
          <p className="label label-light">(01) — {COVER_LABELS[trip.coverStyle]} TRIP · {trip.status.toUpperCase()}</p>
          <h1>
            {trip.title} <em>— {trip.destination}</em>
          </h1>
          <p className="trip-hero-meta">
            {formatDate(trip.startDate)} — {formatDate(trip.endDate)} · {trip.dayCount} days · {trip.travellers} traveller{trip.travellers === 1 ? '' : 's'}
            {trip.demo ? ' · Sample trip' : ''}
          </p>
          {trip.notes ? <p className="trip-notes">{trip.notes}</p> : null}
        </div>
        <div className="trip-hero-side">
          <p className="countdown-big">{daysUntil(trip.startDate)}</p>
          <p className="countdown-label">until departure</p>
          <div className="burndown" aria-label={`Budget used: ${usedPct} percent`}>
            <div className="burndown-track">
              <div className={`burndown-fill ${summary.overBudget ? 'is-over' : ''}`} style={{ width: `${usedPct}%` }} />
            </div>
            <p className="burndown-text">
              {inr(summary.totalCost)} of {inr(trip.budget)} used · {summary.overBudget ? `over by ${inr(-summary.remaining)}` : `${inr(summary.remaining)} left`}
            </p>
          </div>
        </div>
      </section>

      <section className="timeline-section" aria-label="Trip timeline">
        <div className="section-head">
          <h2><span className="section-num">(02)</span> Timeline</h2>
          <p className="section-note">Pick a day. Drag activities to reorder them.</p>
        </div>
        <div className="timeline-rail" role="tablist" aria-label="Days of this trip">
          {days.map((d) => (
            <button
              key={d.index}
              type="button"
              role="tab"
              aria-selected={d.index === day.index}
              className={`timeline-day ${d.index === day.index ? 'is-active' : ''}`}
              onClick={() => setDayIndex(d.index)}
            >
              <span className="timeline-day-num">Day {d.index + 1}</span>
              <span className="timeline-day-date">{formatDateShort(d.date)}</span>
              <span className="timeline-day-count">{d.activities.length} activit{d.activities.length === 1 ? 'y' : 'ies'}</span>
            </button>
          ))}
        </div>

        <div className="day-panel">
          <div className="day-panel-head">
            <h3>Day {day.index + 1} — {formatDate(day.date)}</h3>
            {canEdit ? (
              <button type="button" className="btn btn-primary btn-small" onClick={() => setShowActivity('new')}>
                + Add activity
              </button>
            ) : null}
          </div>
          {day.activities.length === 0 ? (
            <p className="empty-state">Nothing planned for this day yet — add the first activity.</p>
          ) : (
            <ul className="activity-list">
              {day.activities.map((a) => (
                <li
                  key={a._id}
                  className="activity-row"
                  draggable={canEdit}
                  onDragStart={() => { dragId.current = a._id; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleReorder}
                  data-activity-id={a._id}
                >
                  <span className="activity-time" aria-label={`${a.startTime} to ${a.endTime}`}>
                    {a.startTime}–{a.endTime}
                  </span>
                  <span className="activity-main">
                    <span className="activity-title">{a.title}</span>
                    <span className="activity-meta">
                      {categoryLabel(a.category)}{a.cost ? ` · ${inr(a.cost)} planned` : ''}{a.notes ? ` · ${a.notes}` : ''}
                    </span>
                  </span>
                  {canEdit ? (
                    <span className="activity-actions">
                      <button type="button" className="btn btn-ghost btn-small" onClick={() => setShowActivity(a)}>Edit</button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={async () => { await api.deleteActivity(tripId, a._id); load(); }}
                        aria-label={`Delete ${a.title}`}
                      >
                        Delete
                      </button>
                    </span>
                  ) : null}
                  <span className="drag-hint" aria-hidden="true" title="Drag to reorder">⠿</span>
                </li>
              ))}
            </ul>
          )}
          {day.expenses.length > 0 ? (
            <p className="day-spend">Spent this day: {inr(day.expenses.reduce((n, e) => n + e.amount, 0))}</p>
          ) : null}
        </div>
      </section>

      <section className="split-section" aria-label="Budget and packing">
        <div className="budget-panel">
          <div className="section-head">
            <h2><span className="section-num">(03)</span> Budget</h2>
            {canEdit ? (
              <button type="button" className="btn btn-primary btn-small" onClick={() => setShowExpense(true)}>
                + Log expense
              </button>
            ) : null}
          </div>
          <p className="budget-big">
            {inr(summary.totalSpent)} spent <span>· {inr(summary.plannedCost)} planned · {inr(summary.totalCost)} total</span>
          </p>
          {summary.overBudget ? (
            <p className="budget-warning" role="alert">Over budget by {inr(-summary.remaining)} — review planned activities or raise the budget.</p>
          ) : null}
          {showExpense ? (
            <form className="inline-form" onSubmit={addExpense} noValidate>
              <label className="field">
                <span>What was it? *</span>
                <input value={expenseForm.title} onChange={(e) => setExpenseForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Stay — night 1" autoFocus />
              </label>
              <label className="field">
                <span>Category</span>
                <select value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))}>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{categoryLabel(c)}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Amount (₹) *</span>
                <input type="number" min="0" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} placeholder="3000" />
              </label>
              <button type="submit" className="btn btn-primary btn-small">Save expense</button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setShowExpense(false)}>Cancel</button>
              {expenseError ? <p className="form-error" role="alert">{expenseError}</p> : null}
            </form>
          ) : null}
          <ul className="expense-list">
            {days.flatMap((d) => d.expenses).map((e) => (
              <li key={e._id} className="expense-row">
                <span className="expense-title">{e.title}</span>
                <span className="expense-meta">Day {e.dayIndex + 1} · {categoryLabel(e.category)}</span>
                <span className="expense-amount">{inr(e.amount)}</span>
                {canEdit ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={async () => { await api.deleteExpense(tripId, e._id); load(); }}
                    aria-label={`Delete expense ${e.title}`}
                  >
                    Delete
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {days.flatMap((d) => d.expenses).length === 0 ? (
            <p className="empty-state">No expenses logged yet.</p>
          ) : null}
          {analytics && Object.keys(analytics.spendByCategory).length > 0 ? (
            <div className="category-bars" aria-label="Spend by category">
              {Object.entries(analytics.spendByCategory).map(([cat, amount]) => (
                <div key={cat} className="category-bar-row">
                  <span>{categoryLabel(cat)}</span>
                  <span className="category-bar-track">
                    <span className="category-bar-fill" style={{ width: `${Math.round((amount / Math.max(1, analytics.totalSpent)) * 100)}%` }} />
                  </span>
                  <span>{inr(amount)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="packing-panel">
          <div className="section-head">
            <h2><span className="section-num">(04)</span> Packing</h2>
            {canEdit ? (
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={async () => { await api.packingTemplate(tripId); load(); }}
              >
                Add from template
              </button>
            ) : null}
          </div>
          <div className="packing-top">
            <PackingRing done={summary.packingDone} total={summary.packingTotal} />
            <p className="packing-note">
              {summary.packingTotal === 0
                ? 'Start with the essentials template, or add your own items.'
                : `${summary.packingDone} of ${summary.packingTotal} items packed.`}
            </p>
          </div>
          {canEdit ? (
            <form className="inline-form" onSubmit={addPacking}>
              <label className="field">
                <span className="visually-hidden">New packing item</span>
                <input value={packingLabel} onChange={(e) => setPackingLabel(e.target.value)} placeholder="Add an item…" aria-label="New packing item" />
              </label>
              <label className="field">
                <span className="visually-hidden">Category</span>
                <select value={packingCategory} onChange={(e) => setPackingCategory(e.target.value)} aria-label="Packing category">
                  {PACKING_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{categoryLabel(c)}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn btn-primary btn-small">Add</button>
            </form>
          ) : null}
          <ul className="packing-list">
            {packing.map((p) => (
              <li key={p._id} className={`packing-row ${p.checked ? 'is-checked' : ''}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={p.checked}
                    disabled={!canEdit}
                    onChange={async () => { await api.updatePacking(tripId, p._id, { checked: !p.checked }); load(); }}
                  />
                  <span>{p.label}</span>
                  <span className="packing-cat">{categoryLabel(p.category)}</span>
                </label>
                {canEdit ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={async () => { await api.deletePacking(tripId, p._id); load(); }}
                    aria-label={`Delete packing item ${p.label}`}
                  >
                    ✕
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {packing.length === 0 ? <p className="empty-state">Packing list is empty.</p> : null}
        </div>
      </section>

      {analytics ? (
        <section className="analytics-section" aria-label="Trip analytics">
          <div className="section-head">
            <h2><span className="section-num">(05)</span> Trip analytics</h2>
          </div>
          <ul className="stat-strip">
            <li><strong>{inr(Math.round(analytics.costPerDay))}</strong><span>cost per day</span></li>
            <li><strong>{analytics.itineraryDensity.toFixed(1)}</strong><span>activities per day</span></li>
            <li><strong>{analytics.activityCount}</strong><span>activities planned</span></li>
            <li><strong>{analytics.budgetUsedPct}%</strong><span>of budget used</span></li>
            <li><strong>{analytics.daysUntilDeparture}</strong><span>days to departure</span></li>
          </ul>
          <div className="per-day-chart" aria-label="Cost per day chart">
            {analytics.perDay.map((d) => (
              <div key={d.index} className="per-day-col">
                <div
                  className="per-day-bar"
                  style={{ height: `${Math.max(4, Math.round((d.total / maxDayTotal) * 100))}%` }}
                  title={`Day ${d.index + 1}: ${inr(d.total)}`}
                />
                <span className="per-day-label">D{d.index + 1}</span>
                <span className="per-day-value">{inr(d.total)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="collab-section" aria-label="Collaborators">
        <div className="section-head">
          <h2><span className="section-num">(06)</span> Co-travellers</h2>
          {isOwner ? (
            <button type="button" className="btn btn-primary btn-small" onClick={() => setShowInvite(true)}>
              Invite by email
            </button>
          ) : null}
        </div>
        <ul className="collab-list">
          <li>
            <span>{trip.owner === currentUser.id ? `${currentUser.name} (you)` : 'Owner'}</span>
            <span className="collab-role">Owner</span>
          </li>
          {trip.collaborators.map((c) => (
            <li key={c.user.id}>
              <span>{c.user.name} · {c.user.email}</span>
              <span className="collab-role">{categoryLabel(c.role)}</span>
            </li>
          ))}
        </ul>
        {trip.collaborators.length === 0 ? <p className="empty-state">Only you can see this trip — invite a co-traveller to share it.</p> : null}
        {showInvite ? (
          <form className="inline-form" onSubmit={invite} noValidate>
            <label className="field">
              <span>Email of a registered traveller *</span>
              <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} placeholder="friend@voyara.example" autoFocus />
            </label>
            <label className="field">
              <span>Role</span>
              <select value={inviteForm.role} onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="viewer">Viewer — can see, cannot edit</option>
                <option value="editor">Editor — can edit activities and expenses</option>
              </select>
            </label>
            <button type="submit" className="btn btn-primary btn-small">Send invite</button>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setShowInvite(false)}>Cancel</button>
            {inviteError ? <p className="form-error" role="alert">{inviteError}</p> : null}
            {inviteStatus ? <p className="form-status" role="status">{inviteStatus}</p> : null}
          </form>
        ) : null}
        <p className="fine-print">
          Viewers can see the trip but cannot change it. Editors can add and edit activities,
          expenses and packing items. Only the owner can invite or delete the trip.
        </p>
      </section>

      <footer className="site-footer">
        <span>© 2026 Akhand</span>
        <span>Voyara — a demo travel planner. No real bookings or payments.</span>
      </footer>

      {showActivity ? (
        <Dialog
          title={showActivity === 'new' ? `Add activity — Day ${day.index + 1}` : `Edit activity — Day ${day.index + 1}`}
          onClose={() => setShowActivity(null)}
        >
          <ActivityForm
            tripId={tripId}
            dayIndex={day.index}
            initial={showActivity === 'new' ? null : showActivity}
            onClose={() => setShowActivity(null)}
            onSaved={() => { setShowActivity(null); load(); }}
          />
        </Dialog>
      ) : null}
    </main>
  );
}
