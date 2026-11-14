import { useEffect, useState } from 'react';
import { api, inr, timeAgo, CATEGORY_LABELS } from '../api';

export default function Admin({ user, onGo }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .adminOverview()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Could not load the admin overview');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user || user.role !== 'admin') {
    return (
      <div className="section">
        <p className="label">(Admin)</p>
        <h1>Admins only.</h1>
        <p className="lede">The admin overview is only visible to admin accounts. Sign in with the demo admin account to see it.</p>
        <button type="button" className="btn btn-primary" onClick={() => onGo({ name: 'auth', mode: 'login' })}>
          Sign in as admin
        </button>
      </div>
    );
  }

  return (
    <div className="section">
      <p className="label">(Admin)</p>
      <h1>
        The house <em>ledger.</em>
      </h1>
      <p className="lede">Live totals across every lot and bid on BidSphere.</p>
      {loading ? (
        <p aria-live="polite">Loading the overview…</p>
      ) : error ? (
        <p className="error-text" role="alert">{error}</p>
      ) : data ? (
        <>
          <dl className="stat-grid">
            <div><dt>Users</dt><dd>{data.users}</dd></div>
            <div><dt>Live lots</dt><dd>{data.liveAuctions}</dd></div>
            <div><dt>Ended lots</dt><dd>{data.endedAuctions}</dd></div>
            <div><dt>Total bids</dt><dd>{data.totalBids}</dd></div>
            <div><dt>Volume (ended lots)</dt><dd>{inr(data.totalVolume)}</dd></div>
          </dl>
          <section aria-labelledby="cat-heading">
            <h2 id="cat-heading">Lots by category</h2>
            {data.byCategory.length === 0 ? (
              <p className="empty-state">No lots yet.</p>
            ) : (
              <ol className="rule-rows">
                {data.byCategory.map((c) => (
                  <li key={c.category}>
                    <span className="rule-num">{CATEGORY_LABELS[c.category] || c.category}</span>
                    <span className="rule-text">
                      {c.auctions} lot{c.auctions === 1 ? '' : 's'} · {c.bids} bid{c.bids === 1 ? '' : 's'}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section aria-labelledby="recent-heading">
            <h2 id="recent-heading">Recent bids</h2>
            {data.recentBids.length === 0 ? (
              <p className="empty-state">No bids yet.</p>
            ) : (
              <ol className="bid-feed">
                {data.recentBids.map((b) => (
                  <li key={b.id} className="bid-row">
                    <span className="bid-row-amount">{inr(b.amount)}</span>
                    <span className="bid-row-bidder">
                      {b.bidder} on {b.auctionTitle}
                    </span>
                    <span className="bid-row-time">{timeAgo(b.createdAt)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
