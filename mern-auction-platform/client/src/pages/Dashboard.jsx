import { useEffect, useState } from 'react';
import { api, inr, timeLeft, timeAgo } from '../api';

const TABS = [
  { value: 'bids', label: 'My bids' },
  { value: 'listings', label: 'My listings' },
  { value: 'watchlist', label: 'Watchlist' },
];

const STATUS_LABELS = {
  winning: 'Winning',
  won: 'Won',
  outbid: 'Outbid',
  lost: 'Lost',
};

export default function Dashboard({ user, onOpenLot, onGo, notify }) {
  const [tab, setTab] = useState('bids');
  const [bids, setBids] = useState([]);
  const [listings, setListings] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [cancelBusy, setCancelBusy] = useState({});

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Bidders cannot list lots, so do not call the seller-only endpoint
    // for them — it would answer 403 and log a failed request.
    const listingsCall =
      user && user.role !== 'bidder'
        ? api.myListings().catch(() => ({ auctions: [] }))
        : Promise.resolve({ auctions: [] });
    Promise.all([api.myBids(), listingsCall, api.watchlist()])
      .then(([b, l, w]) => {
        if (cancelled) return;
        setBids(b.bids || []);
        setListings(l.auctions || []);
        setWatchlist(w.auctions || []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Could not load your dashboard');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function cancelListing(auction) {
    setCancelBusy((b) => ({ ...b, [auction.id]: true }));
    try {
      await api.cancelAuction(auction.id);
      setListings((rows) => rows.map((a) => (a.id === auction.id ? { ...a, status: 'cancelled' } : a)));
      notify(`Cancelled: “${auction.title}”`, 'success');
    } catch (err) {
      notify(err.message || 'Could not cancel this lot', 'error');
    } finally {
      setCancelBusy((b) => ({ ...b, [auction.id]: false }));
    }
  }

  if (!user) {
    return (
      <div className="section">
        <p className="label">(Dashboard)</p>
        <h1>Sign in to see your dashboard.</h1>
        <p className="lede">Your bids, your listings and your watchlist live here.</p>
        <button type="button" className="btn btn-primary" onClick={() => onGo({ name: 'auth', mode: 'login' })}>
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="section">
      <p className="label">(Dashboard)</p>
      <h1>
        Your <em>auction floor.</em>
      </h1>
      <p className="lede">Signed in as {user.name} ({user.role}). Bids, listings and watched lots, in one place.</p>

      <div className="tabs" role="tablist" aria-label="Dashboard sections">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            className={`tab ${tab === t.value ? 'is-active' : ''}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
            {t.value === 'bids' ? ` (${bids.length})` : ''}
            {t.value === 'listings' ? ` (${listings.length})` : ''}
            {t.value === 'watchlist' ? ` (${watchlist.length})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <p aria-live="polite">Loading your dashboard…</p>
      ) : error ? (
        <p className="error-text" role="alert">{error}</p>
      ) : tab === 'bids' ? (
        bids.length === 0 ? (
          <p className="empty-state">You have not bid on anything yet. Browse the live lots and place your first bid.</p>
        ) : (
          <ol className="dash-rows">
            {bids.map((b) => (
              <li key={b.id} className="dash-row">
                <button type="button" className="dash-main" onClick={() => onOpenLot(b.auction.id)}>
                  <span className="dash-title">{b.auction.title}</span>
                  <span className="dash-meta">
                    Your bid {inr(b.amount)} · {timeAgo(b.createdAt)} · current {inr(b.auction.currentBid)}
                  </span>
                </button>
                <span className={`status-pill ${b.status === 'winning' || b.status === 'won' ? 'is-live' : 'is-out'}`}>
                  {STATUS_LABELS[b.status] || b.status}
                </span>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => onOpenLot(b.auction.id)}>
                  Open lot
                </button>
              </li>
            ))}
          </ol>
        )
      ) : tab === 'listings' ? (
        user.role === 'bidder' ? (
          <p className="empty-state">Bidder accounts cannot list lots. Register a seller account to list your first lot.</p>
        ) : listings.length === 0 ? (
          <p className="empty-state">You have not listed anything yet.</p>
        ) : (
          <ol className="dash-rows">
            {listings.map((a) => {
              const left = timeLeft(a.endsAt, now);
              const live = a.status === 'live' && left;
              return (
                <li key={a.id} className="dash-row">
                  <button type="button" className="dash-main" onClick={() => onOpenLot(a.id)}>
                    <span className="dash-title">{a.title}</span>
                    <span className="dash-meta">
                      {inr(a.currentBid)} · {a.bidsCount} bid{a.bidsCount === 1 ? '' : 's'} · {live ? `${left} left` : a.status}
                    </span>
                  </button>
                  <span className={`status-pill ${live ? 'is-live' : ''}`}>{live ? '● Live' : a.status}</span>
                  {a.status === 'live' && a.bidsCount === 0 ? (
                    <button type="button" className="btn btn-ghost btn-small" disabled={cancelBusy[a.id]} onClick={() => cancelListing(a)}>
                      Cancel lot
                    </button>
                  ) : (
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => onOpenLot(a.id)}>
                      Open lot
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        )
      ) : watchlist.length === 0 ? (
        <p className="empty-state">Nothing watched yet. Tap ☆ Watch on any lot to keep it here.</p>
      ) : (
        <ol className="dash-rows">
          {watchlist.map((a) => {
            const left = timeLeft(a.endsAt, now);
            const live = a.status === 'live' && left;
            return (
              <li key={a.id} className="dash-row">
                <button type="button" className="dash-main" onClick={() => onOpenLot(a.id)}>
                  <span className="dash-title">{a.title}</span>
                  <span className="dash-meta">
                    {inr(a.currentBid)} · {a.bidsCount} bid{a.bidsCount === 1 ? '' : 's'} · {live ? `${left} left` : a.status}
                  </span>
                </button>
                <span className={`status-pill ${live ? 'is-live' : ''}`}>{live ? '● Live' : a.status}</span>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => onOpenLot(a.id)}>
                  {live ? 'Bid now' : 'View lot'}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
