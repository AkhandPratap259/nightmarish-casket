import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  api, asArray, formatDate, formatMoney, memberId, memberName, todayStr, userIdOf,
} from '../api';
import { getSocket } from '../socket';
import { EXPENSE_CATEGORIES } from '../data/content';
import Dialog from '../components/Dialog';
import SplitEditor from '../components/SplitEditor';
import BalanceBar from '../components/BalanceBar';
import SettlementFlow from '../components/SettlementFlow';
import SettlementDiagram from '../components/SettlementDiagram';
import CategoryDonut from '../components/CategoryDonut';
import Reveal from '../components/Reveal';

const TABS = [
  { id: 'expenses', label: 'Expenses' },
  { id: 'balances', label: 'Balances' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'activity', label: 'Activity' },
];

export default function GroupDetail({ user }) {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [activity, setActivity] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('expenses');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '', amount: '', category: 'Food', paidBy: '', date: todayStr(), notes: '',
  });
  const [splitType, setSplitType] = useState('equal');
  const [splitValues, setSplitValues] = useState({});
  const [splitValid, setSplitValid] = useState(false);
  const splitPayloadRef = useRef([]);
  const [expenseError, setExpenseError] = useState('');
  const [expenseBusy, setExpenseBusy] = useState(false);

  const [settleOpen, setSettleOpen] = useState(false);
  const [settleForm, setSettleForm] = useState({ from: '', to: '', amount: '', note: '' });
  const [settleError, setSettleError] = useState('');
  const [settleBusy, setSettleBusy] = useState(false);

  const [memberEmail, setMemberEmail] = useState('');
  const [memberError, setMemberError] = useState('');
  const [memberBusy, setMemberBusy] = useState(false);

  const currency = group?.currency || 'INR';
  const myId = userIdOf(user);

  const members = useMemo(() => {
    const raw = group?.members || [];
    return raw.map((m) => ({
      id: memberId(m),
      name: memberName(m),
      email: typeof m === 'object' ? m.email || '' : '',
      raw: m,
    }));
  }, [group]);

  const memberNameById = useMemo(() => {
    const map = {};
    members.forEach((m) => {
      map[m.id] = m.name;
      if (m.raw && typeof m.raw === 'object') {
        if (m.raw.userId) map[m.raw.userId] = m.name;
        if (m.raw.user) map[String(m.raw.user)] = m.name;
      }
    });
    return map;
  }, [members]);

  function resolveName(value) {
    if (!value) return 'Unknown';
    if (typeof value === 'object') return memberName(value);
    return memberNameById[value] || value;
  }

  function resolveId(value) {
    if (!value) return '';
    if (typeof value === 'object') return memberId(value);
    if (memberNameById[value]) return value;
    const hit = members.find((m) => m.name === value);
    return hit ? hit.id : value;
  }

  const loadAll = useCallback(async () => {
    try {
      const [g, exp, bal, settle, act, ana] = await Promise.all([
        api.getGroup(id),
        api.listExpenses(id),
        api.getBalances(id),
        api.listSettlements(id),
        api.getActivity(id),
        api.getAnalytics(id),
      ]);
      setGroup(g?.group || g);
      setExpenses(asArray(exp, 'expenses'));
      setBalances(bal);
      setSettlements(asArray(settle, 'settlements'));
      setActivity(asArray(act, 'activity'));
      setAnalytics(ana);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Live updates: the server joins this socket to the group room.
  useEffect(() => {
    if (!user) return undefined;
    const socket = getSocket(myId);
    const refetch = () => loadAll();
    socket.on('expense:added', refetch);
    socket.on('settlement:added', refetch);
    socket.on('balance:updated', refetch);
    return () => {
      socket.off('expense:added', refetch);
      socket.off('settlement:added', refetch);
      socket.off('balance:updated', refetch);
    };
  }, [user, myId, loadAll]);

  useEffect(() => {
    if (expenseOpen && members.length && !expenseForm.paidBy) {
      setExpenseForm((f) => ({ ...f, paidBy: myId || members[0].id }));
    }
  }, [expenseOpen, members, myId, expenseForm.paidBy]);

  async function reloadExpenses() {
    try {
      const exp = await api.listExpenses(id, {
        ...(categoryFilter ? { category: categoryFilter } : {}),
        ...(search ? { q: search } : {}),
      });
      setExpenses(asArray(exp, 'expenses'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (group) reloadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, search]);

  function handleSplitValidity(valid, payload) {
    setSplitValid(valid);
    splitPayloadRef.current = payload;
  }

  async function submitExpense(e) {
    e.preventDefault();
    setExpenseError('');
    setExpenseBusy(true);
    try {
      const body = {
        title: expenseForm.title.trim(),
        amount: Number(expenseForm.amount),
        category: expenseForm.category,
        paidBy: expenseForm.paidBy,
        splitType,
        splits: splitPayloadRef.current,
        date: expenseForm.date || undefined,
        notes: expenseForm.notes.trim() || undefined,
      };
      await api.createExpense(id, body);
      setExpenseOpen(false);
      setExpenseForm({ title: '', amount: '', category: 'Food', paidBy: '', date: todayStr(), notes: '' });
      setSplitType('equal');
      setSplitValues({});
      setNotice('Expense added — balances updated live.');
      loadAll();
    } catch (err) {
      setExpenseError(err.message);
    } finally {
      setExpenseBusy(false);
    }
  }

  async function deleteExpense(expenseId) {
    if (!window.confirm('Delete this expense? Balances will update.')) return;
    try {
      await api.deleteExpense(id, expenseId);
      setNotice('Expense deleted.');
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addMember(e) {
    e.preventDefault();
    setMemberError('');
    setMemberBusy(true);
    try {
      await api.addMember(id, { email: memberEmail.trim() });
      setMemberEmail('');
      setNotice('Member added to the group.');
      loadAll();
    } catch (err) {
      setMemberError(err.message);
    } finally {
      setMemberBusy(false);
    }
  }

  async function removeMember(userId, name) {
    if (!window.confirm(`Remove ${name} from this group?`)) return;
    try {
      await api.removeMember(id, userId);
      setNotice(`${name} removed from the group.`);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  function openSettlement(planItem) {
    setSettleForm({
      from: resolveId(planItem.fromId ?? planItem.from),
      to: resolveId(planItem.toId ?? planItem.to),
      amount: String(planItem.amount ?? ''),
      note: '',
    });
    setSettleError('');
    setSettleOpen(true);
  }

  async function submitSettlement(e) {
    e.preventDefault();
    setSettleError('');
    setSettleBusy(true);
    try {
      await api.recordSettlement(id, {
        from: settleForm.from,
        to: settleForm.to,
        amount: Number(settleForm.amount),
        note: settleForm.note.trim() || undefined,
      });
      setSettleOpen(false);
      setNotice('Settlement recorded — balances updated.');
      loadAll();
    } catch (err) {
      setSettleError(err.message);
    } finally {
      setSettleBusy(false);
    }
  }

  if (!user) {
    return (
      <main className="page">
        <h1 className="page-title">Sign in to open this <em>group</em></h1>
        <p>
          <Link className="btn btn-primary" to="/login">Sign in</Link>
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="page">
        <p className="muted" role="status">Loading group…</p>
      </main>
    );
  }

  if (error && !group) {
    return (
      <main className="page">
        <h1 className="page-title">Group not <em>found</em></h1>
        <p className="form-error" role="alert">{error}</p>
        <p>
          <Link to="/groups">Back to groups</Link>
        </p>
      </main>
    );
  }

  const balanceMembers = (balances?.members || []).map((m) => ({
    userId: m.userId || m.user || m._id || m.id,
    name: m.name || resolveName(m.userId || m.user),
    net: Number(m.net ?? m.balance ?? 0),
  }));
  const maxAbs = Math.max(1, ...balanceMembers.map((m) => Math.abs(m.net)));
  const simplified = (balances?.simplified || []).map((s) => ({
    from: s.from,
    to: s.to,
    fromId: s.fromId || s.from,
    toId: s.toId || s.to,
    fromName: s.fromName || resolveName(s.from),
    toName: s.toName || resolveName(s.to),
    amount: s.amount ?? s.value ?? 0,
  }));
  const beforeCount = balances?.debts
    ? (Array.isArray(balances.debts) ? balances.debts.length : Number(balances.debts))
    : simplified.length;
  const byMonth = Array.isArray(analytics?.byMonth)
    ? analytics.byMonth
    : Object.entries(analytics?.byMonth || {}).map(([month, total]) => ({ month, total }));
  const monthMax = Math.max(1, ...byMonth.map((b) => Number(b.total) || 0));

  return (
    <main className="page group-detail">
      <p className="section-label">(01) Group</p>
      <div className="section-head-row">
        <h1 className="page-title">{group?.name}</h1>
        <button type="button" className="btn btn-primary" onClick={() => setExpenseOpen(true)}>
          + Add expense
        </button>
      </div>
      {group?.description && <p className="page-sub">{group.description}</p>}
      {error && (
        <p className="form-error" role="alert">{error}</p>
      )}
      {notice && (
        <p className="live-notice" role="status">{notice}</p>
      )}

      <section className="members-section" aria-labelledby="members-heading">
        <h2 className="section-title-small" id="members-heading">
          Members · {members.length}
        </h2>
        <ul className="member-list">
          {members.map((m) => (
            <li key={m.id || m.name} className="member-row">
              <span className="avatar" aria-hidden="true">{m.name.slice(0, 1).toUpperCase()}</span>
              <span className="member-name">{m.name}</span>
              <span className="muted small">{m.email}</span>
              {m.id !== myId && (
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => removeMember(m.id, m.name)}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        <form className="member-add" onSubmit={addMember}>
          <label className="field">
            <span>Add a member by email</span>
            <input
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              required
              placeholder="friend@example.com"
            />
          </label>
          <button type="submit" className="btn btn-ghost" disabled={memberBusy}>
            {memberBusy ? 'Adding…' : 'Add member'}
          </button>
        </form>
        {memberError && (
          <p className="form-error" role="alert">{memberError}</p>
        )}
      </section>

      <div className="tabs" role="tablist" aria-label="Group sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? 'tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'expenses' && (
        <section aria-label="Expenses">
          <div className="filters filters--expenses">
            <label className="field">
              <span>Search expenses</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title…"
              />
            </label>
            <label className="field">
              <span>Category</span>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">All categories</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          {expenses.length === 0 ? (
            <p className="empty-state">
              No expenses yet. Add the first one — dinner, fuel, tickets — and FairShare
              will split it for the group.
            </p>
          ) : (
            <ul className="expense-list">
              {expenses.map((exp) => {
                const paidById = typeof exp.paidBy === 'object' ? memberId(exp.paidBy) : exp.paidBy;
                const isMine = paidById === myId;
                return (
                  <li key={exp._id || exp.id} className="expense-row tilt">
                    <div className="expense-main">
                      <span className="offering-category">{exp.category || 'Other'}</span>
                      <strong className="expense-title">{exp.title}</strong>
                      <span className="muted small">
                        Paid by {resolveName(exp.paidBy)}
                        {exp.date ? ` · ${formatDate(exp.date)}` : ''}
                        {exp.notes ? ` · ${exp.notes}` : ''}
                      </span>
                    </div>
                    <div className="expense-side">
                      <strong className="expense-amount">{formatMoney(exp.amount, currency)}</strong>
                      {isMine && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-small"
                          onClick={() => deleteExpense(exp._id || exp.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {tab === 'balances' && (
        <section aria-label="Balances">
          <Reveal>
            <p className="section-label">(02) Who owes whom</p>
            <h2 className="section-title">Balances, <em>netted out</em></h2>
          </Reveal>
          {balanceMembers.length === 0 ? (
            <p className="empty-state">No balances yet — add an expense to see who owes whom.</p>
          ) : (
            <div className="balances-grid">
              <div>
                <h3 className="section-title-small">Per-member balance</h3>
                <div className="kanban-lanes">
                  {[
                    { id: 'owes', label: 'Owes', cls: 'kanban-lane--owes', list: balanceMembers.filter((m) => m.net < -0.005) },
                    { id: 'owed', label: 'Gets back', cls: 'kanban-lane--owed', list: balanceMembers.filter((m) => m.net > 0.005) },
                    { id: 'settled', label: 'Settled up', cls: 'kanban-lane--settled', list: balanceMembers.filter((m) => Math.abs(m.net) <= 0.005) },
                  ].map((lane) => (
                    <div key={lane.id} className={`kanban-lane ${lane.cls}`}>
                      <div className="kanban-lane-head">
                        <span>{lane.label}</span>
                        <span>{lane.list.length}</span>
                      </div>
                      <div className="kanban-lane-body">
                        {lane.list.length === 0 ? (
                          <p className="kanban-empty">Nobody here yet.</p>
                        ) : (
                          lane.list.map((m, i) => (
                            <div key={m.userId || m.name} className="kanban-card" style={{ animationDelay: `${i * 120}ms` }}>
                              <BalanceBar name={m.name} net={m.net} maxAbs={maxAbs} currency={currency} />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="settlement-panel">
                <h3 className="section-title-small">Simplified settlement plan</h3>
                <SettlementDiagram plan={simplified} currency={currency} />
                <SettlementFlow
                  plan={simplified}
                  beforeCount={beforeCount}
                  currency={currency}
                  onSettle={openSettlement}
                />
              </div>
            </div>
          )}

          {settlements.length > 0 && (
            <section aria-labelledby="settlements-heading" className="section">
              <h3 className="section-title-small" id="settlements-heading">Settlements recorded</h3>
              <ul className="ruled-list">
                {settlements.map((s, i) => (
                  <li key={s._id || s.id || i}>
                    <span>
                      {resolveName(s.from)} → {resolveName(s.to)}
                      {s.note ? ` · ${s.note}` : ''}
                    </span>
                    <strong>{formatMoney(s.amount, currency)}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>
      )}

      {tab === 'analytics' && (
        <section aria-label="Analytics">
          <p className="section-label">(02) Analytics</p>
          <h2 className="section-title">Where the money <em>went</em></h2>
          <div className="stat-strip stat-strip--three">
            <div className="stat">
              <span>Total spent</span>
              <strong>{formatMoney(analytics?.totalSpent ?? 0, currency)}</strong>
            </div>
            <div className="stat">
              <span>Expenses</span>
              <strong>{analytics?.expenseCount ?? expenses.length}</strong>
            </div>
            <div className="stat">
              <span>Average per person</span>
              <strong>{formatMoney(analytics?.avgPerPerson ?? 0, currency)}</strong>
            </div>
          </div>
          <div className="analytics-grid">
            <div>
              <h3 className="section-title-small">Spend by category</h3>
              <CategoryDonut data={analytics?.byCategory || []} currency={currency} />
            </div>
            <div>
              <h3 className="section-title-small">Spend by month</h3>
              {byMonth.length === 0 ? (
                <p className="muted">No monthly data yet.</p>
              ) : (
                <ul className="month-chart">
                  {byMonth.map((b) => (
                    <li key={b.month} className="month-bar-row">
                      <span className="month-label">{b.month}</span>
                      <div className="month-track">
                        <div
                          className="month-fill"
                          style={{ width: `${Math.round(((Number(b.total) || 0) / monthMax) * 100)}%` }}
                        />
                      </div>
                      <strong className="month-value">{formatMoney(b.total, currency)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === 'activity' && (
        <section aria-label="Activity">
          <p className="section-label">(02) Activity</p>
          <h2 className="section-title">What happened, <em>in order</em></h2>
          {activity.length === 0 ? (
            <p className="empty-state">No activity yet — expenses and settlements will show up here.</p>
          ) : (
            <ul className="ruled-list activity-list">
              {activity.map((a, i) => (
                <li key={a._id || a.id || i}>
                  <span>
                    <strong>{a.type ? a.type.replace(/_/g, ' ') : 'Activity'}</strong>
                    {' — '}
                    {a.description || a.text || a.message || ''}
                  </span>
                  <span className="muted small">
                    {a.amount != null ? formatMoney(a.amount, currency) : ''}
                    {a.createdAt ? ` · ${new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Dialog open={expenseOpen} onClose={() => setExpenseOpen(false)} title="Add an expense">
        <form className="form" onSubmit={submitExpense} noValidate>
          <label className="field">
            <span>Title</span>
            <input
              type="text"
              value={expenseForm.title}
              onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
              required
              placeholder="Dinner at the beach shack"
            />
          </label>
          <div className="form-row-2">
            <label className="field">
              <span>Amount ({currency})</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Category</span>
              <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row-2">
            <label className="field">
              <span>Paid by</span>
              <select value={expenseForm.paidBy} onChange={(e) => setExpenseForm({ ...expenseForm, paidBy: e.target.value })}>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Date</span>
              <input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            <span>Notes (optional)</span>
            <textarea
              rows={2}
              value={expenseForm.notes}
              onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
            />
          </label>
          <SplitEditor
            members={members}
            amount={expenseForm.amount}
            currency={currency}
            splitType={splitType}
            values={splitValues}
            onTypeChange={(t) => {
              setSplitType(t);
              setSplitValues({});
            }}
            onValuesChange={setSplitValues}
            onValidityChange={handleSplitValidity}
          />
          {expenseError && (
            <p className="form-error" role="alert">{expenseError}</p>
          )}
          <div className="dialog-actions">
            <button type="submit" className="btn btn-primary" disabled={expenseBusy || !splitValid}>
              {expenseBusy ? 'Adding…' : 'Add expense'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setExpenseOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog open={settleOpen} onClose={() => setSettleOpen(false)} title="Record a settlement">
        <form className="form" onSubmit={submitSettlement} noValidate>
          <div className="form-row-2">
            <label className="field">
              <span>From (pays)</span>
              <select value={settleForm.from} onChange={(e) => setSettleForm({ ...settleForm, from: e.target.value })}>
                <option value="">Select a member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>To (receives)</span>
              <select value={settleForm.to} onChange={(e) => setSettleForm({ ...settleForm, to: e.target.value })}>
                <option value="">Select a member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Amount ({currency})</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={settleForm.amount}
              onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Note (optional)</span>
            <input
              type="text"
              value={settleForm.note}
              onChange={(e) => setSettleForm({ ...settleForm, note: e.target.value })}
              placeholder="UPI, cash, bank transfer…"
            />
          </label>
          {settleError && (
            <p className="form-error" role="alert">{settleError}</p>
          )}
          <div className="dialog-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={settleBusy || !settleForm.from || !settleForm.to || !settleForm.amount || settleForm.from === settleForm.to}
            >
              {settleBusy ? 'Recording…' : 'Record settlement'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setSettleOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}
