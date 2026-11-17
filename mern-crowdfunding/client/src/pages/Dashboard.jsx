import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { STATUS_LABELS, formatINR, categoryLabel } from '../data/config';
import FundingBar from '../components/FundingBar';

export default function Dashboard({ user, onGo, onRequireAuth, notify }) {
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [myPledges, setMyPledges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    setError('');
    const pledgesReq = api.myPledges().catch(() => ({ pledges: [] }));
    const campaignsReq =
      user.role === 'creator' || user.role === 'admin'
        ? api.campaigns({ limit: 50 }).catch(() => ({ campaigns: [] }))
        : Promise.resolve({ campaigns: [] });
    Promise.all([pledgesReq, campaignsReq])
      .then(([pledgesRes, campaignsRes]) => {
        setMyPledges(pledgesRes.pledges || pledgesRes || []);
        const all = campaignsRes.campaigns || [];
        // Server list has no owner filter in the contract; keep campaigns
        // created by this user (creator email matches) when available.
        setMyCampaigns(all.filter((c) => c.creator?.email && user.email && c.creator.email === user.email));
      })
      .catch((e) => setError(e.message || 'Could not load your dashboard.'))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return (
      <div className="page">
        <p className="section-label">Dashboard</p>
        <h1>Your dashboard</h1>
        <p className="page-sub">Sign in to see your campaigns and pledges.</p>
        <button type="button" className="btn btn-primary" onClick={onRequireAuth}>
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="page dashboard">
      <p className="section-label">Dashboard</p>
      <h1>Welcome back, <em>{user.name}.</em></h1>
      <p className="page-sub">
        Signed in as {user.email} ({user.role}).{' '}
        {(user.role === 'creator' || user.role === 'admin') ? (
          <button type="button" className="link-btn" onClick={() => onGo({ name: 'create' })}>Start a new campaign →</button>
        ) : null}
      </p>

      {loading ? (
        <p className="empty-note">Loading your dashboard…</p>
      ) : error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : (
        <>
          <section aria-labelledby="my-campaigns-heading">
            <h2 id="my-campaigns-heading">My campaigns</h2>
            {user.role !== 'creator' && user.role !== 'admin' ? (
              <p className="empty-note">You are signed in as a backer — you have no campaigns of your own.</p>
            ) : myCampaigns.length === 0 ? (
              <p className="empty-note">
                No campaigns yet.{' '}
                <button type="button" className="link-btn" onClick={() => onGo({ name: 'create' })}>Start your first campaign →</button>
              </p>
            ) : (
              <ol className="ruled-list">
                {myCampaigns.map((c, i) => (
                  <li key={c._id} className="ruled-row dash-row">
                    <button type="button" className="dash-btn" onClick={() => onGo({ name: 'campaign', id: c._id })}>
                      <span className="row-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                      <span className="dash-main">
                        <span className="dash-title">
                          {c.title}
                          {c.isSample ? <span className="sample-tag">Sample campaign</span> : null}
                        </span>
                        <span className="dash-meta">
                          {categoryLabel(c.category)} · {STATUS_LABELS[c.status] || c.status} · {c.backerCount} backers
                        </span>
                        <FundingBar pledged={c.pledgedTotal} goal={c.goal} showLabels={false} />
                      </span>
                      <span className="dash-figures">
                        <span className="dash-pledged">{formatINR(c.pledgedTotal)}</span>
                        <span className="dash-goal">of {formatINR(c.goal)}</span>
                        {c.status === 'draft' ? <span className="dash-hint">Publish when ready</span> : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="my-pledges-heading">
            <h2 id="my-pledges-heading">My pledges</h2>
            {myPledges.length === 0 ? (
              <p className="empty-note">
                You have not backed any campaign yet.{' '}
                <button type="button" className="link-btn" onClick={() => onGo({ name: 'browse' })}>Browse campaigns →</button>
              </p>
            ) : (
              <ol className="ruled-list">
                {myPledges.map((p, i) => {
                  const title = p.campaign?.title || p.campaignTitle || 'Campaign';
                  const status = p.campaign?.status || p.campaignStatus || '';
                  const id = p.campaign?._id || p.campaignId;
                  return (
                    <li key={p._id || i} className="ruled-row pledge-row">
                      <span className="row-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                      <span className="pledge-main">
                        {id ? (
                          <button type="button" className="link-btn pledge-campaign" onClick={() => onGo({ name: 'campaign', id })}>
                            {title}
                          </button>
                        ) : (
                          <span className="pledge-campaign">{title}</span>
                        )}
                        <span className="pledge-meta">
                          {p.rewardTitle ? `${p.rewardTitle} · ` : ''}
                          {status ? STATUS_LABELS[status] || status : ''}
                          {p.anonymous ? ' · Anonymous' : ''}
                          {p.createdAt ? ` · ${new Date(p.createdAt).toLocaleDateString('en-IN')}` : ''}
                        </span>
                      </span>
                      <span className="pledge-amount">{formatINR(p.amount)}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
