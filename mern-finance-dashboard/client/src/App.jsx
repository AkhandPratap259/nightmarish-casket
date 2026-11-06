import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const todayMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
};
const shiftMonth = (m, delta) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Count-up numbers: animate from the previous value to the new one.
function useCountUp(value, duration = 700) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to || reducedMotion()) {
      setDisplay(to);
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

function CountUp({ value, prefix = '' }) {
  const v = useCountUp(value);
  return (
    <span className="num">
      {prefix}
      {Math.round(v).toLocaleString('en-IN')}
    </span>
  );
}

// Reveal-on-scroll wrapper.
function Reveal({ children, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) {
      el.classList.add('visible');
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && el.classList.add('visible')),
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

// Animated SVG donut of spending by category.
function Donut({ data }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    const t = setTimeout(() => setReady(true), 30);
    return () => clearTimeout(t);
  }, [data]);
  const total = data.reduce((s, c) => s + c.spent, 0);
  let offset = 25; // start at 12 o'clock
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 120 120" className="donut">
        <circle cx="60" cy="60" r="45" fill="none" stroke="#e9e2d2" strokeWidth="16" />
        {total > 0 &&
          data.map((c) => {
            const pct = (c.spent / total) * 100;
            const el = (
              <circle
                key={c.categoryId}
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke={c.colour}
                strokeWidth="16"
                pathLength="100"
                strokeDasharray={ready ? `${pct} ${100 - pct}` : '0 100'}
                strokeDashoffset={offset}
                className="donut-seg"
              />
            );
            offset -= pct;
            return el;
          })}
        <text x="60" y="56" textAnchor="middle" className="donut-total">
          {inr(total)}
        </text>
        <text x="60" y="72" textAnchor="middle" className="donut-label">
          spent
        </text>
      </svg>
      <ul className="donut-legend">
        {data.slice(0, 6).map((c) => (
          <li key={c.categoryId}>
            <span className="swatch" style={{ background: c.colour }} />
            {c.icon} {c.name}
            <b>{inr(c.spent)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Animated bar chart of daily spend for the month.
function DailyBars({ days }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    const t = setTimeout(() => setReady(true), 30);
    return () => clearTimeout(t);
  }, [days]);
  const max = Math.max(1, ...days.map((d) => d.expense));
  return (
    <div className="bars" role="img" aria-label="Daily spending bar chart">
      {days.map((d) => (
        <div key={d.day} className="bar-col" title={`Day ${d.day}: spent ${inr(d.expense)}, earned ${inr(d.income)}`}>
          <div
            className="bar"
            style={{ height: ready ? `${Math.max(2, (d.expense / max) * 100)}%` : '2%' }}
          />
          <span className="bar-day">{d.day % 5 === 0 ? d.day : ''}</span>
        </div>
      ))}
    </div>
  );
}

// Animated progress ring for a savings goal.
function GoalRing({ pct, colour }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 40);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <svg viewBox="0 0 64 64" className="goal-ring">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#e9e2d2" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke={colour}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={ready ? circ * (1 - Math.min(100, pct) / 100) : circ}
        transform="rotate(-90 32 32)"
        className="ring-arc"
      />
      <text x="32" y="36" textAnchor="middle" className="ring-pct">
        {pct}%
      </text>
    </svg>
  );
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@paisapilot.example');
  const [password, setPassword] = useState('PaisaPilot123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data =
        mode === 'login'
          ? await api.login({ email, password })
          : await api.register({ name, email, password });
      setToken(data.token);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card reveal visible">
        <div className="brand-mark">₹</div>
        <h1>PaisaPilot</h1>
        <p className="tagline">Your money, neatly entered in the ledger.</p>
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Sign in
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            Register
          </button>
        </div>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Open my ledger' : 'Create my ledger'}
          </button>
        </form>
        <p className="demo-hint">
          Demo account: <code>demo@paisapilot.example</code> / <code>PaisaPilot123!</code>
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [month, setMonth] = useState(todayMonth());
  const [overview, setOverview] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Transaction filters
  const [fKind, setFKind] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fAccount, setFAccount] = useState('');
  const [fQuery, setFQuery] = useState('');

  // Add-transaction form
  const [tx, setTx] = useState({ account: '', category: '', kind: 'expense', amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
  // Transfer form
  const [tr, setTr] = useState({ fromId: '', toId: '', amount: '' });
  // Budget form
  const [bd, setBd] = useState({ category: '', limit: '' });
  // Goal form
  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', savedAmount: '', colour: '#c9a227' });
  const [contribute, setContribute] = useState({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ month });
      if (fKind) params.set('kind', fKind);
      if (fCategory) params.set('category', fCategory);
      if (fAccount) params.set('account', fAccount);
      if (fQuery) params.set('q', fQuery);
      const [ov, accs, cats, txns, gls, rec] = await Promise.all([
        api.overview(month),
        api.accounts(),
        api.categories(),
        api.transactions(`?${params.toString()}`),
        api.goals(),
        api.recurring(),
      ]);
      setOverview(ov);
      setAccounts(accs);
      setCategories(cats);
      setTransactions(txns);
      setGoals(gls);
      setRecurring(rec);
      if (accs.length && !tx.account) setTx((s) => ({ ...s, account: accs[0]._id }));
      if (cats.length && !tx.category) {
        const food = cats.find((c) => c.name === 'Food') || cats[0];
        setTx((s) => ({ ...s, category: food._id }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [month, fKind, fCategory, fAccount, fQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then((u) => setUser(u))
      .catch(() => setToken(null));
  }, []);

  useEffect(() => {
    if (user) loadAll();
  }, [user, loadAll]);

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  const netWorth = useMemo(() => accounts.reduce((s, a) => s + a.balance, 0), [accounts]);
  const totals = overview?.totals || { income: 0, expense: 0, net: 0, savingsRate: 0 };
  const expenseCats = useMemo(
    () => categories.filter((c) => c.kind === (tx.kind || 'expense')),
    [categories, tx.kind]
  );

  const addTransaction = async (e) => {
    e.preventDefault();
    try {
      await api.addTransaction({
        account: tx.account,
        category: tx.category,
        kind: tx.kind,
        amount: Number(tx.amount),
        date: tx.date,
        note: tx.note,
      });
      setTx((s) => ({ ...s, amount: '', note: '' }));
      flash('Transaction entered in the ledger.');
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const doTransfer = async (e) => {
    e.preventDefault();
    try {
      const updated = await api.transfer({ fromId: tr.fromId, toId: tr.toId, amount: Number(tr.amount) });
      setAccounts(updated);
      setTr({ fromId: '', toId: '', amount: '' });
      flash('Transfer complete.');
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveBudget = async (e) => {
    e.preventDefault();
    try {
      await api.upsertBudget({ month, category: bd.category, limit: Number(bd.limit) });
      setBd({ category: '', limit: '' });
      flash('Budget set.');
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const addGoal = async (e) => {
    e.preventDefault();
    try {
      await api.addGoal({
        name: goalForm.name,
        targetAmount: Number(goalForm.targetAmount),
        savedAmount: Number(goalForm.savedAmount) || 0,
        colour: goalForm.colour,
      });
      setGoalForm({ name: '', targetAmount: '', savedAmount: '', colour: '#c9a227' });
      flash('Goal added.');
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const contributeGoal = async (id) => {
    const amount = Number(contribute[id]);
    if (!amount || amount <= 0) return;
    try {
      await api.contributeGoal(id, amount);
      setContribute((s) => ({ ...s, [id]: '' }));
      flash('Contribution added to the goal.');
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const generateDue = async () => {
    try {
      const res = await api.generateDue();
      flash(`${res.created} recurring payment${res.created === 1 ? '' : 's'} posted to the ledger.`);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!user) return <AuthScreen onAuth={setUser} />;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">₹</span>
          <div>
            <h1>PaisaPilot</h1>
            <span className="brand-sub">Personal finance ledger</span>
          </div>
        </div>
        <div className="month-switcher">
          <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
          <strong key={month} className="month-label">{monthLabel(month)}</strong>
          <button onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">›</button>
        </div>
        <div className="user-chip">
          <span>{user.name}</span>
          <button
            className="btn-ghost"
            onClick={() => {
              setToken(null);
              setUser(null);
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {notice && <p className="notice">{notice}</p>}
      {error && <p className="error banner">{error}</p>}
      {loading && <p className="loading">Balancing the books…</p>}

      <main className="ledger-grid">
        {/* LEFT RAIL — accounts & net worth */}
        <aside className="rail left-rail">
          <Reveal>
            <section className="panel networth">
              <h2>Net worth</h2>
              <p className="big-num">
                <CountUp value={netWorth} prefix="₹" />
              </p>
              <p className="muted">Across {accounts.length} account{accounts.length === 1 ? '' : 's'}</p>
            </section>
          </Reveal>
          <Reveal>
            <section className="panel">
              <h2>Accounts</h2>
              <ul className="account-list">
                {accounts.map((a) => (
                  <li key={a._id}>
                    <span className="swatch" style={{ background: a.colour }} />
                    <span className="acc-name">{a.name}</span>
                    <span className="acc-type">{a.type}</span>
                    <b className="num">{inr(a.balance)}</b>
                  </li>
                ))}
              </ul>
              <form className="mini-form" onSubmit={doTransfer}>
                <h3>Transfer between accounts</h3>
                <select value={tr.fromId} onChange={(e) => setTr({ ...tr, fromId: e.target.value })} required>
                  <option value="">From…</option>
                  {accounts.map((a) => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
                <select value={tr.toId} onChange={(e) => setTr({ ...tr, toId: e.target.value })} required>
                  <option value="">To…</option>
                  {accounts.map((a) => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  placeholder="Amount ₹"
                  value={tr.amount}
                  onChange={(e) => setTr({ ...tr, amount: e.target.value })}
                  required
                />
                <button className="btn-primary" type="submit">Transfer</button>
              </form>
            </section>
          </Reveal>
          <Reveal>
            <section className="panel">
              <h2>Recurring</h2>
              <ul className="recurring-list">
                {recurring.map((r) => (
                  <li key={r._id}>
                    <span>{r.name}</span>
                    <b className={r.kind === 'income' ? 'pos' : 'neg'}>
                      {r.kind === 'income' ? '+' : '−'}{inr(r.amount)}
                    </b>
                    <span className="muted small">
                      {r.frequency} · next {new Date(r.nextDate).toLocaleDateString('en-IN')}
                    </span>
                    <button
                      className="btn-ghost small"
                      onClick={() => api.toggleRecurring(r._id, !r.active).then(loadAll)}
                    >
                      {r.active ? 'Pause' : 'Resume'}
                    </button>
                  </li>
                ))}
              </ul>
              <button className="btn-secondary" onClick={generateDue}>
                Generate due payments
              </button>
            </section>
          </Reveal>
        </aside>

        {/* CENTRE — KPIs, charts, transactions */}
        <section className="centre">
          <Reveal>
            <div className="kpi-strip">
              <div className="kpi income">
                <span>Income</span>
                <strong><CountUp value={totals.income} prefix="₹" /></strong>
              </div>
              <div className="kpi expense">
                <span>Spending</span>
                <strong><CountUp value={totals.expense} prefix="₹" /></strong>
              </div>
              <div className="kpi net">
                <span>Net saved</span>
                <strong><CountUp value={totals.net} prefix="₹" /></strong>
              </div>
              <div className="kpi rate">
                <span>Savings rate</span>
                <strong><CountUp value={totals.savingsRate} />%</strong>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <section className="panel charts-panel">
              <div className="chart-block">
                <h2>Spending by category</h2>
                {overview ? <Donut data={overview.byCategory} /> : <p className="muted">No data yet.</p>}
              </div>
              <div className="chart-block">
                <h2>Daily spend — {monthLabel(month)}</h2>
                {overview ? (
                  <DailyBars key={month} days={overview.dailyTrend} />
                ) : (
                  <p className="muted">No data yet.</p>
                )}
                <p className="muted small">
                  Projected month-end spend: <b>{overview ? inr(overview.forecast.projectedMonthEndExpense) : '—'}</b>
                  {' '}· projected balance: <b>{overview ? inr(overview.forecast.projectedBalance) : '—'}</b>
                </p>
              </div>
            </section>
          </Reveal>

          <Reveal>
            <section className="panel">
              <h2>Budget burn — {monthLabel(month)}</h2>
              <ul className="budget-list">
                {(overview?.byCategory || [])
                  .filter((c) => c.limit !== null)
                  .map((c) => {
                    const pct = Math.min(150, c.pct || 0);
                    const over = (c.pct || 0) > 100;
                    return (
                      <li key={c.categoryId} className={over ? 'over' : ''}>
                        <div className="budget-head">
                          <span>{c.icon} {c.name}</span>
                          <span className="num">
                            {inr(c.spent)} of {inr(c.limit)}
                          </span>
                          <b>{c.pct}%</b>
                        </div>
                        <div className="burn-track">
                          <div className="burn-fill" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className="muted small">
                          {over ? `Over by ${inr(c.spent - c.limit)}` : `${inr(c.remaining)} left`}
                        </span>
                      </li>
                    );
                  })}
              </ul>
              <form className="mini-form inline" onSubmit={saveBudget}>
                <select value={bd.category} onChange={(e) => setBd({ ...bd, category: e.target.value })} required>
                  <option value="">Set a budget for…</option>
                  {categories
                    .filter((c) => c.kind === 'expense')
                    .map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                </select>
                <input
                  type="number"
                  min="0"
                  placeholder="Monthly limit ₹"
                  value={bd.limit}
                  onChange={(e) => setBd({ ...bd, limit: e.target.value })}
                  required
                />
                <button className="btn-secondary" type="submit">Save budget</button>
              </form>
            </section>
          </Reveal>

          <Reveal>
            <section className="panel">
              <div className="section-head">
                <h2>Transactions</h2>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    const params = new URLSearchParams({ month });
                    if (fKind) params.set('kind', fKind);
                    if (fCategory) params.set('category', fCategory);
                    if (fAccount) params.set('account', fAccount);
                    if (fQuery) params.set('q', fQuery);
                    api.exportCsv(`?${params.toString()}`);
                  }}
                >
                  Export CSV ↓
                </button>
              </div>
              <div className="filters">
                <select value={fKind} onChange={(e) => setFKind(e.target.value)}>
                  <option value="">All kinds</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                <select value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                <select value={fAccount} onChange={(e) => setFAccount(e.target.value)}>
                  <option value="">All accounts</option>
                  {accounts.map((a) => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
                <input
                  type="search"
                  placeholder="Search notes…"
                  value={fQuery}
                  onChange={(e) => setFQuery(e.target.value)}
                />
              </div>
              <form className="tx-form" onSubmit={addTransaction}>
                <select value={tx.kind} onChange={(e) => setTx({ ...tx, kind: e.target.value })}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
                <select value={tx.category} onChange={(e) => setTx({ ...tx, category: e.target.value })} required>
                  {expenseCats.map((c) => (
                    <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
                  ))}
                </select>
                <select value={tx.account} onChange={(e) => setTx({ ...tx, account: e.target.value })} required>
                  {accounts.map((a) => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Amount ₹"
                  value={tx.amount}
                  onChange={(e) => setTx({ ...tx, amount: e.target.value })}
                  required
                />
                <input type="date" value={tx.date} onChange={(e) => setTx({ ...tx, date: e.target.value })} required />
                <input
                  type="text"
                  placeholder="Note (e.g. Groceries)"
                  value={tx.note}
                  onChange={(e) => setTx({ ...tx, note: e.target.value })}
                />
                <button className="btn-primary" type="submit">Add</button>
              </form>
              <ul className="txn-list">
                {transactions.map((t) => (
                  <li key={t._id}>
                    <span className="swatch" style={{ background: t.category?.colour || '#0f3d2e' }} />
                    <span className="txn-icon">{t.category?.icon || '•'}</span>
                    <span className="txn-note">{t.note || t.category?.name}</span>
                    <span className="muted small">
                      {t.category?.name} · {t.account?.name} · {new Date(t.date).toLocaleDateString('en-IN')}
                    </span>
                    <b className={t.kind === 'income' ? 'pos' : 'neg'}>
                      {t.kind === 'income' ? '+' : '−'}{inr(t.amount)}
                    </b>
                    <button
                      className="btn-ghost small danger"
                      onClick={async () => {
                        await api.deleteTransaction(t._id);
                        flash('Transaction removed; balance restored.');
                        loadAll();
                      }}
                    >
                      ✕
                    </button>
                  </li>
                ))}
                {transactions.length === 0 && <li className="muted">No transactions match these filters.</li>}
              </ul>
            </section>
          </Reveal>
        </section>

        {/* RIGHT RAIL — insights & goals */}
        <aside className="rail right-rail">
          <Reveal>
            <section className="panel insights">
              <h2>Insights</h2>
              <ul>
                {(overview?.insights || []).map((ins, i) => (
                  <li key={i} className={`insight ${ins.type}`}>
                    {ins.text}
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
          <Reveal>
            <section className="panel">
              <h2>Savings goals</h2>
              <ul className="goal-list">
                {goals.map((g) => {
                  const pct = g.targetAmount ? Math.round((g.savedAmount / g.targetAmount) * 100) : 0;
                  return (
                    <li key={g._id} className="goal-card">
                      <GoalRing pct={pct} colour={g.colour} />
                      <div className="goal-body">
                        <strong>{g.name}</strong>
                        <span className="num">
                          {inr(g.savedAmount)} of {inr(g.targetAmount)}
                        </span>
                        {g.deadline && (
                          <span className="muted small">
                            Due {new Date(g.deadline).toLocaleDateString('en-IN')}
                          </span>
                        )}
                        <div className="contribute-row">
                          <input
                            type="number"
                            min="1"
                            placeholder="Add ₹"
                            value={contribute[g._id] || ''}
                            onChange={(e) => setContribute({ ...contribute, [g._id]: e.target.value })}
                          />
                          <button className="btn-secondary small" onClick={() => contributeGoal(g._id)}>
                            Contribute
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <form className="mini-form" onSubmit={addGoal}>
                <h3>New goal</h3>
                <input
                  type="text"
                  placeholder="Goal name"
                  value={goalForm.name}
                  onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                  required
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Target ₹"
                  value={goalForm.targetAmount}
                  onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
                  required
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Already saved ₹ (optional)"
                  value={goalForm.savedAmount}
                  onChange={(e) => setGoalForm({ ...goalForm, savedAmount: e.target.value })}
                />
                <button className="btn-primary" type="submit">Add goal</button>
              </form>
            </section>
          </Reveal>
          <Reveal>
            <section className="panel forecast">
              <h2>Month-end forecast</h2>
              {overview && (
                <>
                  <p>
                    At today&apos;s run-rate of <b>{inr(overview.forecast.runRate)}/day</b>, spending should reach{' '}
                    <b>{inr(overview.forecast.projectedMonthEndExpense)}</b> by {monthLabel(month).split(' ')[1]} 30.
                  </p>
                  <p>
                    Projected balance: <b>{inr(overview.forecast.projectedBalance)}</b>
                  </p>
                </>
              )}
            </section>
          </Reveal>
        </aside>
      </main>
      <footer className="foot">
        PaisaPilot · amounts in whole rupees · mock data only — no real bank connection, no live payments.
      </footer>
    </div>
  );
}
