import { useEffect, useState } from 'react';
import { api } from '../api';
import { STATUS_LABELS, formatINR, categoryLabel } from '../data/config';

export default function Admin({ user, onGo }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setLoading(false);
      return;
    }
    api
      .adminOverview()
      .then((res) => setData(res))
      .catch((e) => setError(e.message || 'Could not load the admin overview.'))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="page">
        <p className="section-label">Admin</p>
        <h1>Admin overview</h1>
        <p className="page-sub">This area is for admins only. Sign in with an admin account to continue.</p>
        <button type="button" className="btn btn-primary" onClick={() => onGo({ name: 'browse' })}>
          Browse campaigns
        </button>
      </div>
    );
  }

  const totals = data?.totals || {};
  const byStatus = data?.campaignsByStatus || {};

  return (
    <div className="page admin">
      <p className="section-label">Admin</p>
      <h1>Platform <em>overview.</em></h1>
      <p className="page-sub">Totals, campaign health and the latest activity across FundForge.</p>

      {loading ? (
        <p className="empty-note">Loading overview…</p>
      ) : error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : (
        <>
          <section aria-labelledby="totals-heading">
            <h2 id="totals-heading" className="sr-only">Totals</h2>
            <dl className="admin-totals">
              <div className="admin-total">
                <dt>Users</dt>
                <dd>{totals.users ?? 0}</dd>
              </div>
              <div className="admin-total">
                <dt>Campaigns</dt>
                <dd>{totals.campaigns ?? 0}</dd>
              </div>
              <div className="admin-total">
                <dt>Pledges</dt>
                <dd>{totals.pledges ?? 0}</dd>
              </div>
              <div className="admin-total">
                <dt>Total pledged</dt>
                <dd>{formatINR(totals.pledgedTotal ?? 0)}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="status-heading">
            <h2 id="status-heading">Campaigns by status</h2>
            <ol className="ruled-list status-list">
              {Object.keys(STATUS_LABELS).map((s) => (
                <li key={s} className="ruled-row status-row">
                  <span className="status-name">{STATUS_LABELS[s]}</span>
                  <span className="status-count">{byStatus[s] ?? 0}</span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="recent-pledges-heading">
            <h2 id="recent-pledges-heading">Recent pledges</h2>
            {(data?.recentPledges || []).length === 0 ? (
              <p className="empty-note">No pledges yet.</p>
            ) : (
              <ol className="ruled-list">
                {(data.recentPledges || []).map((p, i) => (
                  <li key={p._id || i} className="ruled-row admin-row">
                    <span className="row-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    <span className="admin-main">
                      <span className="admin-title">{p.campaign?.title || p.campaignTitle || 'Campaign'}</span>
                      <span className="admin-meta">
                        {p.backerName || 'A backer'}
                        {p.rewardTitle ? ` · ${p.rewardTitle}` : ''}
                        {p.createdAt ? ` · ${new Date(p.createdAt).toLocaleString('en-IN')}` : ''}
                      </span>
                    </span>
                    <span className="admin-amount">{formatINR(p.amount)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="recent-campaigns-heading">
            <h2 id="recent-campaigns-heading">Recent campaigns</h2>
            {(data?.recentCampaigns || []).length === 0 ? (
              <p className="empty-note">No campaigns yet.</p>
            ) : (
              <ol className="ruled-list">
                {(data.recentCampaigns || []).map((c, i) => (
                  <li key={c._id || i} className="ruled-row admin-row">
                    <button type="button" className="admin-btn" onClick={() => onGo({ name: 'campaign', id: c._id })}>
                      <span className="row-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                      <span className="admin-main">
                        <span className="admin-title">
                          {c.title}
                          {c.isSample ? <span className="sample-tag">Sample campaign</span> : null}
                        </span>
                        <span className="admin-meta">
                          {categoryLabel(c.category)} · {STATUS_LABELS[c.status] || c.status} · by {c.creator?.name || 'Unknown creator'}
                        </span>
                      </span>
                      <span className="admin-amount">{formatINR(c.pledgedTotal || 0)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
