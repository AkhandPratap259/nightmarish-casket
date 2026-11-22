import { useEffect, useMemo, useState } from 'react';
import { api, inr, timeLeft, CATEGORIES, CATEGORY_LABELS } from '../api';
import { config } from '../data/config';
import LotArt from '../components/LotArt';
import LaneBoard from '../components/LaneBoard';
import CountdownRing from '../components/CountdownRing';
import { getSocket } from '../socket';

const SORTS = [
  { value: 'ending', label: 'Ending soon' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'most-bids', label: 'Most bids' },
];

export default function Browse({ user, onOpenLot, onGo, onRequireAuth, notify }) {
  const [auctions, setAuctions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('live');
  const [sort, setSort] = useState('ending');
  const [now, setNow] = useState(Date.now());
  const [watchBusy, setWatchBusy] = useState({});

  const endingSoon = useMemo(
    () =>
      auctions
        .filter((a) => a.status === 'live' && new Date(a.endsAt).getTime() - now < 6 * 60 * 60 * 1000)
        .slice(0, 5),
    [auctions, now]
  );
  const featured = endingSoon[0] || auctions.find((a) => a.status === 'live');

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .auctions({ q: q || undefined, category: category || undefined, status, sort, page, limit: 12 })
      .then((data) => {
        if (cancelled) return;
        setAuctions(data.auctions || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Could not load lots');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, category, status, sort, page]);

  // Live updates: a new bid anywhere refreshes that row's price in place.
  useEffect(() => {
    const socket = getSocket(user?.id);
    const onBid = (payload) => {
      setAuctions((rows) =>
        rows.map((a) =>
          String(a.id) === String(payload.auctionId)
            ? { ...a, currentBid: payload.currentBid, bidsCount: payload.bidsCount, endsAt: payload.endsAt || a.endsAt }
            : a
        )
      );
    };
    const onEnded = (payload) => {
      setAuctions((rows) => rows.map((a) => (String(a.id) === String(payload.id) ? { ...a, status: 'ended' } : a)));
    };
    socket.on('bid:new', onBid);
    socket.on('auction:ended', onEnded);
    return () => {
      socket.off('bid:new', onBid);
      socket.off('auction:ended', onEnded);
    };
  }, [user]);

  function resetPage(fn) {
    setPage(1);
    fn();
  }

  async function toggleWatch(auction) {
    if (!user) return onRequireAuth();
    setWatchBusy((b) => ({ ...b, [auction.id]: true }));
    try {
      if (auction.watched) await api.removeWatch(auction.id);
      else await api.addWatch(auction.id);
      setAuctions((rows) => rows.map((a) => (a.id === auction.id ? { ...a, watched: !a.watched } : a)));
    } catch (err) {
      notify(err.message || 'Could not update watchlist', 'error');
    } finally {
      setWatchBusy((b) => ({ ...b, [auction.id]: false }));
    }
  }

  return (
    <div>
      {/* (01) HERO — a riso poster: misregistered mono type, Bauhaus shapes,
          and a tilted blue live-lot panel with a red offset shadow. */}
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <svg className="hero-shapes" width="180" height="120" viewBox="0 0 180 120" aria-hidden="true">
            <g style={{ mixBlendMode: 'multiply' }}>
              <circle cx="40" cy="40" r="34" fill="#e8442e" />
              <polygon points="110,10 150,80 70,80" fill="#f2c200" />
              <path d="M 130 118 A 26 26 0 0 1 182 118 Z" fill="#1d3fae" />
            </g>
          </svg>
          <p className="label">(01) Live auctions</p>
          <h1 id="hero-heading" aria-label="Bid live. Win loud.">
            Bid <em>live.</em>
            <br />
            Win loud.
          </h1>
          <p className="lede">
            Real lots, real bids, real time. Every bid lands for everyone at once, and a bid in the final minute
            extends the clock — so the loudest bidder wins, not the fastest click.
          </p>
          <div className="hero-ctas">
            <button type="button" className="btn btn-primary" onClick={() => document.getElementById('lots')?.scrollIntoView({ behavior: 'smooth' })}>
              Browse live lots
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => (user ? onGo({ name: 'create' }) : onRequireAuth())}
            >
              List a lot
            </button>
          </div>
          <p className="hero-note">
            {total} lot{total === 1 ? '' : 's'} listed · sample lots for trying the app · no real money changes hands
          </p>
        </div>
        <div className="hero-live">
          <p className="label label-light">Ending soonest — live now</p>
          {featured ? (
            <button type="button" className="hero-lot" onClick={() => onOpenLot(featured.id)}>
              <span className="hero-lot-art">
                <LotArt title={featured.title} category={featured.category} label={CATEGORY_LABELS[featured.category]} />
              </span>
              <span className="hero-lot-body">
                <span className="hero-lot-title">{featured.title}</span>
                <span className="hero-lot-meta">
                  {CATEGORY_LABELS[featured.category]} · {featured.city} · {featured.bidsCount} bid{featured.bidsCount === 1 ? '' : 's'}
                </span>
                <span className="hero-lot-bid">
                  <span className="hero-lot-price">{inr(featured.currentBid)}</span>
                  <span className="hero-lot-next">next bid {inr(featured.minNextBid)}</span>
                </span>
              </span>
              <span className="hero-lot-ring">
                <CountdownRing endsAt={featured.endsAt} startsAt={featured.startsAt} size={120} />
              </span>
            </button>
          ) : (
            <p className="hero-empty">No live lots right now — check back soon, or list one yourself.</p>
          )}
          <p className="hero-caption">Tap the lot to open its live bidding room.</p>
        </div>
      </section>

      {/* Live ticker strip — ending-soon lots, scrolling. */}
      {endingSoon.length > 1 ? (
        <div className="ticker" aria-label="Lots ending soon">
          <div className="ticker-track">
            {[...endingSoon, ...endingSoon].map((a, i) => (
              <button key={`${a.id}-${i}`} type="button" className="ticker-item" onClick={() => onOpenLot(a.id)} tabIndex={i >= endingSoon.length ? -1 : 0} aria-hidden={i >= endingSoon.length}>
                <span className="ticker-dot" aria-hidden="true" />
                {a.title} — {inr(a.currentBid)} · {timeLeft(a.endsAt, now) || 'ended'}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* (02) LOTS — Kanban lanes by status (B10). Drag a card by its grip
          to throw it around its lane; dropping it between two cards
          rearranges that lane. Filters and pagination still apply. */}
      <section className="section" id="lots" aria-labelledby="lots-heading">
        <p className="label">(02) The lots</p>
        <h2 id="lots-heading">
          Every lot, <em>on the clock.</em>
        </h2>
        <form
          className="filters"
          onSubmit={(e) => e.preventDefault()}
          role="search"
          aria-label="Filter lots"
        >
          <label className="filter-field">
            <span className="visually-hidden">Search lots</span>
            <input
              type="search"
              value={q}
              placeholder="Search lots…"
              onChange={(e) => resetPage(() => setQ(e.target.value))}
              aria-label="Search lots"
            />
          </label>
          <label className="filter-field">
            <span className="visually-hidden">Category</span>
            <select value={category} onChange={(e) => resetPage(() => setCategory(e.target.value))} aria-label="Category">
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span className="visually-hidden">Status</span>
            <select value={status} onChange={(e) => resetPage(() => setStatus(e.target.value))} aria-label="Status">
              <option value="live">Live now</option>
              <option value="ended">Ended</option>
              <option value="all">Live + ended</option>
            </select>
          </label>
          <label className="filter-field">
            <span className="visually-hidden">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort lots">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </form>

        <div aria-live="polite" className="results-line">
          {loading ? 'Loading lots…' : `${total} lot${total === 1 ? '' : 's'}`}
        </div>
        {error ? <p className="error-text" role="alert">{error}</p> : null}

        {loading ? (
          <div className="skeleton-list" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-row" />
            ))}
          </div>
        ) : auctions.length === 0 ? (
          <p className="empty-state">No lots match these filters yet. Try a different category or clear the search.</p>
        ) : (
          <LaneBoard
            auctions={auctions}
            now={now}
            onOpenLot={onOpenLot}
            toggleWatch={toggleWatch}
            watchBusy={watchBusy}
          />
        )}

        {pages > 1 ? (
          <nav className="pagination" aria-label="Lot pages">
            <button type="button" className="btn btn-ghost btn-small" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              ← Previous
            </button>
            <span aria-live="polite">
              Page {page} of {pages}
            </span>
            <button type="button" className="btn btn-ghost btn-small" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Next →
            </button>
          </nav>
        ) : null}
      </section>

      {/* (03) HOW IT WORKS — a bento grid (B1 accent) of mixed-size tiles. */}
      <section className="section section-dark" aria-labelledby="how-heading">
        <p className="label label-light">(03) How bidding works</p>
        <h2 id="how-heading" className="on-dark">
          Three rules. <em>One winner.</em>
        </h2>
        <ol className="bento">
          <li className="bento-tile bento-tile--wide">
            <span className="bento-num">01</span>
            <span className="bento-text">
              <strong>Bid above the line.</strong> Every new bid must beat the current price by at least the lot&rsquo;s
              minimum increment — the server checks it, so two bids racing each other can&rsquo;t both win.
            </span>
            <svg className="bento-shape" width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
              <circle cx="27" cy="27" r="24" fill="#e8442e" />
            </svg>
          </li>
          <li className="bento-tile bento-tile--red">
            <span className="bento-num">02</span>
            <span className="bento-text">
              <strong>Last-minute bids extend the clock.</strong> A bid in the final 60 seconds adds 60 seconds to the
              auction. No sniping, no luck — the highest bid wins.
            </span>
          </li>
          <li className="bento-tile bento-tile--yellow">
            <span className="bento-num">03</span>
            <span className="bento-text">
              <strong>Everyone sees every bid.</strong> Prices, bid counts and the live feed update for all bidders at
              once over Socket.io. Get outbid and you&rsquo;re told straight away.
            </span>
            <svg className="bento-shape" width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
              <polygon points="27,3 51,51 3,51" fill="#1d3fae" />
            </svg>
          </li>
        </ol>
        <p className="on-dark-muted">
          Bids in this demo are for trying the app — no real money changes hands and no payment is collected.
        </p>
      </section>
    </div>
  );
}
