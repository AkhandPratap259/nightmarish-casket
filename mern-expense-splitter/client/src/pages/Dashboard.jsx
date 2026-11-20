import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, asArray, formatMoney, memberName } from '../api';
import CountUp from '../components/CountUp';
import Reveal from '../components/Reveal';

function pickTotals(data) {
  const t = data?.totals || data || {};
  return {
    youOwe: Number(t.youOwe ?? t.owe ?? t.totalOwed ?? 0),
    youAreOwed: Number(t.youAreOwed ?? t.owedToYou ?? t.totalOwedToYou ?? 0),
    totalSpent: Number(t.totalSpent ?? t.spent ?? 0),
    groupCount: Number(t.groupCount ?? t.groupsCount ?? 0),
    currency: t.currency || data?.currency || 'INR',
  };
}

export default function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .getDashboard()
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (!user) {
    return (
      <main className="page">
        <h1 className="page-title">Sign in to see your <em>dashboard</em></h1>
        <p className="page-sub">
          Your balances, groups and recent activity live here once you sign in.
        </p>
        <p>
          <Link className="btn btn-primary" to="/login">Sign in</Link>
        </p>
      </main>
    );
  }

  const totals = pickTotals(data);
  const groups = asArray(data, 'groups');
  const activity = asArray(data, 'activity').length
    ? asArray(data, 'activity')
    : asArray(data, 'recentActivity');
  const fmt = (v) => formatMoney(v, totals.currency);

  return (
    <main className="page">
      <p className="section-label">(01) Your dashboard</p>
      <h1 className="page-title">
        Hello, <em>{user.name}</em>
      </h1>
      <p className="page-sub">
        What you owe, what you are owed, and what your groups have spent — in one place.
      </p>

      {loading && <p className="muted" role="status">Loading your dashboard…</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <div className="stat-strip stat-strip--three" role="group" aria-label="Your totals">
            <div className="stat stat--owe">
              <span>You owe</span>
              <strong>
                <CountUp value={totals.youOwe} format={fmt} />
              </strong>
              <span className="muted small">Across all your groups</span>
            </div>
            <div className="stat stat--owed">
              <span>You are owed</span>
              <strong>
                <CountUp value={totals.youAreOwed} format={fmt} />
              </strong>
              <span className="muted small">Money coming back to you</span>
            </div>
            <div className="stat">
              <span>Total spent</span>
              <strong>
                <CountUp value={totals.totalSpent} format={fmt} />
              </strong>
              <span className="muted small">By your groups, all time</span>
            </div>
          </div>

          <div className="dashboard-grid">
            <section aria-labelledby="groups-heading">
              <Reveal>
                <div className="section-head-row">
                  <h2 className="section-title-small" id="groups-heading">Your groups</h2>
                  <Link className="btn btn-ghost btn-small" to="/groups">All groups</Link>
                </div>
              </Reveal>
              {groups.length === 0 ? (
                <p className="empty-state">
                  No groups yet. <Link to="/groups">Create your first group</Link> to start
                  splitting expenses.
                </p>
              ) : (
                <ul className="ruled-list group-list">
                  {groups.map((g) => {
                    const myNet = g.myBalance ?? g.myNet ?? g.balance;
                    return (
                      <li key={g._id || g.id} className="tilt group-row">
                        <Link className="group-row-link" to={`/groups/${g._id || g.id}`}>
                          <span className="group-row-name">{g.name}</span>
                          <span className="muted small">
                            {g.memberCount ?? (Array.isArray(g.members) ? g.members.length : 0)} members
                            {g.expenseCount != null ? ` · ${g.expenseCount} expenses` : ''}
                          </span>
                        </Link>
                        {myNet != null && Number(myNet) !== 0 && (
                          <span
                            className={`balance-chip ${Number(myNet) > 0 ? 'balance-chip--positive' : 'balance-chip--negative'}`}
                          >
                            {Number(myNet) > 0 ? 'gets back' : 'owes'} {fmt(Math.abs(Number(myNet)))}
                          </span>
                        )}
                        {myNet != null && Number(myNet) === 0 && (
                          <span className="balance-chip">Settled up</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section aria-labelledby="activity-heading">
              <h2 className="section-title-small" id="activity-heading">Recent activity</h2>
              {activity.length === 0 ? (
                <p className="empty-state">Nothing yet — activity appears when expenses are added or settlements are recorded.</p>
              ) : (
                <ul className="ruled-list activity-list">
                  {activity.slice(0, 10).map((a, i) => (
                    <li key={a._id || a.id || i}>
                      <span>
                        <strong>{a.type ? `${a.type.replace(/_/g, ' ')}` : 'Activity'}</strong>
                        {' — '}
                        {a.description || a.text || a.message || ''}
                        {a.groupName ? ` · ${a.groupName}` : ''}
                      </span>
                      <span className="muted small">
                        {a.amount != null ? fmt(a.amount) : ''}
                        {a.createdAt ? ` · ${new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
