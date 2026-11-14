import { useCallback, useEffect, useRef, useState } from 'react';
import { api, inr, timeLeft, timeAgo, CATEGORY_LABELS, CONDITION_LABELS } from '../api';
import { config, ANTI_SNIPE_NOTE } from '../data/config';
import LotArt from '../components/LotArt';
import CountdownRing from '../components/CountdownRing';
import { getSocket } from '../socket';

export default function LotDetail({ id, user, onBack, onRequireAuth, notify }) {
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [bidBusy, setBidBusy] = useState(false);
  const [watchBusy, setWatchBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [flash, setFlash] = useState(0);
  const [extendedNote, setExtendedNote] = useState('');
  const feedRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api.auction(id);
      setAuction(data.auction);
      setBids(data.bids || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load this lot');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const socket = getSocket(user?.id);
    const onBid = (payload) => {
      if (String(payload.auctionId) !== String(id)) return;
      setAuction((a) =>
        a
          ? { ...a, currentBid: payload.currentBid, bidsCount: payload.bidsCount, endsAt: payload.endsAt || a.endsAt }
          : a
      );
      setBids((rows) => [
        { id: payload.id, amount: payload.amount, bidder: payload.bidder, bidderId: payload.bidderId, createdAt: payload.createdAt },
        ...rows,
      ]);
      setFlash((f) => f + 1);
      if (payload.extended) setExtendedNote('Anti-sniping: a last-minute bid extended this auction by 60 seconds.');
    };
    const onExtended = (payload) => {
      if (String(payload.auctionId) !== String(id)) return;
      setAuction((a) => (a ? { ...a, endsAt: payload.endsAt } : a));
      setExtendedNote('Anti-sniping: a last-minute bid extended this auction by 60 seconds.');
    };
    const onEnded = (payload) => {
      if (String(payload.id) !== String(id)) return;
      setAuction((a) => (a ? { ...a, status: 'ended', winner: payload.winner, winningBid: payload.winningBid } : a));
    };
    socket.on('bid:new', onBid);
    socket.on('auction:extended', onExtended);
    socket.on('auction:ended', onEnded);
    return () => {
      socket.off('bid:new', onBid);
      socket.off('auction:extended', onExtended);
      socket.off('auction:ended', onEnded);
    };
  }, [id, user]);

  // Price flash: re-trigger the pop animation whenever the price changes.
  useEffect(() => {
    if (flash === 0) return;
    const t = window.setTimeout(() => {}, 0);
    return () => window.clearTimeout(t);
  }, [flash]);

  if (loading) {
    return (
      <div className="section">
        <div className="skeleton-list" aria-hidden="true">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
        <p aria-live="polite">Loading lot…</p>
      </div>
    );
  }
  if (error || !auction) {
    return (
      <div className="section">
        <p className="error-text" role="alert">{error || 'Lot not found'}</p>
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Back to lots</button>
      </div>
    );
  }

  const left = timeLeft(auction.endsAt, now);
  const live = auction.status === 'live' && left;
  const isSeller = user && auction.seller && String(auction.seller.id) === String(user.id);
  const topBidderId = bids.length ? bids[0].bidderId : null;
  const amWinning = user && topBidderId && String(topBidderId) === String(user.id) && live;
  const quickAmounts = [auction.minNextBid, auction.minNextBid + auction.minIncrement, auction.minNextBid + auction.minIncrement * 5];

  async function placeBid(e) {
    e.preventDefault();
    if (!user) return onRequireAuth();
    const value = Number(amount);
    if (!Number.isFinite(value) || value < auction.minNextBid) {
      setBidError(`Your bid must be at least ${inr(auction.minNextBid)}`);
      return;
    }
    setBidError('');
    setBidBusy(true);
    try {
      const data = await api.placeBid(auction.id, value);
      setAuction(data.auction);
      setAmount('');
      notify(`Bid placed: ${inr(value)} on “${auction.title}”`, 'success');
      if (data.bid.extended) setExtendedNote('Anti-sniping: your last-minute bid extended this auction by 60 seconds.');
    } catch (err) {
      setBidError(err.message || 'Bid failed');
    } finally {
      setBidBusy(false);
    }
  }

  async function toggleWatch() {
    if (!user) return onRequireAuth();
    setWatchBusy(true);
    try {
      if (auction.watched) await api.removeWatch(auction.id);
      else await api.addWatch(auction.id);
      setAuction((a) => ({ ...a, watched: !a.watched }));
    } catch (err) {
      notify(err.message || 'Could not update watchlist', 'error');
    } finally {
      setWatchBusy(false);
    }
  }

  return (
    <div className="section lot-detail">
      <button type="button" className="back-link" onClick={onBack}>← All lots</button>
      <div className="lot-split">
        {/* Left — the lot itself. */}
        <div className="lot-visual">
          <p className="label">(Lot) {CATEGORY_LABELS[auction.category]}</p>
          <h1 aria-label={auction.title}>{auction.title}</h1>
          <LotArt title={auction.title} category={auction.category} label={CATEGORY_LABELS[auction.category]} className="lot-art-large" />
          <p className="lot-desc">{auction.description}</p>
          <dl className="lot-facts">
            <div><dt>Condition</dt><dd>{CONDITION_LABELS[auction.condition]}</dd></div>
            <div><dt>City</dt><dd>{auction.city}</dd></div>
            <div><dt>Seller</dt><dd>{auction.seller?.name || 'Seller'}</dd></div>
            <div><dt>Listed</dt><dd>{timeAgo(auction.createdAt)}</dd></div>
            <div><dt>Minimum increment</dt><dd>{inr(auction.minIncrement)}</dd></div>
            <div><dt>Starting bid</dt><dd>{inr(auction.startingBid)}</dd></div>
          </dl>
          <p className="fine-print">Sample lot for trying the app — no real item is for sale and no payment is collected.</p>
        </div>

        {/* Right — the live bid console (dark split). */}
        <div className="bid-console">
          <div className="bid-console-head">
            <p className="label label-light">Live bid console</p>
            <span className={`status-pill ${live ? 'is-live' : ''}`}>{live ? '● Live now' : auction.status === 'ended' ? 'Ended' : 'Closed'}</span>
          </div>
          <CountdownRing endsAt={auction.endsAt} startsAt={auction.startsAt} size={160} />
          {extendedNote ? <p className="extend-note" role="status">{extendedNote}</p> : null}
          <p className="current-label">Current bid</p>
          <p className={`current-price ${flash ? 'price-flash' : ''}`} key={auction.currentBid} aria-live="polite">
            {inr(auction.currentBid)}
          </p>
          <p className="current-meta">
            {auction.bidsCount} bid{auction.bidsCount === 1 ? '' : 's'}
            {amWinning ? ' · you are winning' : ''}
            {auction.status === 'ended' && auction.winner ? ` · won by ${auction.winner.name} at ${inr(auction.winningBid)}` : ''}
          </p>

          {live ? (
            isSeller ? (
              <p className="seller-note">This is your lot — sellers cannot bid on their own lots.</p>
            ) : (
              <form onSubmit={placeBid} className="bid-form" noValidate>
                <label htmlFor="bid-amount">Your bid (minimum {inr(auction.minNextBid)})</label>
                <div className="bid-input-row">
                  <span aria-hidden="true">₹</span>
                  <input
                    id="bid-amount"
                    type="number"
                    min={auction.minNextBid}
                    step={auction.minIncrement}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={String(auction.minNextBid)}
                    aria-describedby={bidError ? 'bid-error' : 'bid-hint'}
                    required
                  />
                </div>
                <div className="quick-bids" role="group" aria-label="Quick bid amounts">
                  {quickAmounts.map((v) => (
                    <button key={v} type="button" className="quick-btn" onClick={() => setAmount(String(v))}>
                      {inr(v)}
                    </button>
                  ))}
                </div>
                {bidError ? <p className="error-text" id="bid-error" role="alert">{bidError}</p> : null}
                <p className="field-hint" id="bid-hint">{ANTI_SNIPE_NOTE}</p>
                <button type="submit" className="btn btn-primary btn-block" disabled={bidBusy}>
                  {bidBusy ? 'Placing bid…' : `Place bid — ${amount ? inr(Number(amount) || 0) : inr(auction.minNextBid)}`}
                </button>
              </form>
            )
          ) : (
            <p className="closed-note">
              {auction.status === 'ended'
                ? auction.winner
                  ? `This auction ended. ${auction.winner.name} won it at ${inr(auction.winningBid)}.`
                  : 'This auction ended with no bids.'
                : 'This lot is closed.'}
            </p>
          )}

          <button type="button" className="watch-btn watch-btn-light" onClick={toggleWatch} disabled={watchBusy} aria-pressed={Boolean(auction.watched)}>
            {auction.watched ? '★ Watching this lot' : '☆ Watch this lot'}
          </button>
        </div>
      </div>

      {/* Live bid feed. */}
      <section className="feed-section" aria-labelledby="feed-heading">
        <p className="label">(Bid feed)</p>
        <h2 id="feed-heading">Every bid, <em>as it lands.</em></h2>
        {bids.length === 0 ? (
          <p className="empty-state">No bids yet — be the first. The opening bid is {inr(auction.startingBid)}.</p>
        ) : (
          <ol className="bid-feed" ref={feedRef}>
            {bids.map((b, i) => (
              <li key={b.id} className={`bid-row ${i === 0 ? 'is-top' : ''}`}>
                <span className="bid-row-amount">{inr(b.amount)}</span>
                <span className="bid-row-bidder">
                  {b.bidder}
                  {i === 0 ? ' — highest bid' : ''}
                </span>
                <span className="bid-row-time">{timeAgo(b.createdAt)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
