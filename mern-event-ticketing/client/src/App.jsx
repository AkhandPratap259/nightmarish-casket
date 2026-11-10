import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, setToken, formatDate, formatDateTime, inr } from './api';
import { config, copy } from './data/config';
import Cursor from './components/Cursor';
import Dialog from './components/Dialog';
import SeatMap from './components/SeatMap';

// Reveal-on-scroll: the element stays full-size and a curtain overlay
// slides away when it enters view — never a clip-path collapse, so the
// content is never hidden if the observer never fires.
function Reveal({ children, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return undefined;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${visible ? 'is-visible' : ''} ${className}`}>
      {children}
    </div>
  );
}

function OccupancyBar({ sold, total }) {
  const pct = total ? Math.round((sold / total) * 100) : 0;
  return (
    <div className="occ" role="img" aria-label={`${pct}% sold`}>
      <div className="occ-track">
        <div className="occ-fill" style={{ width: `${pct}%` }} />
      </div>
      <span>{pct}% sold</span>
    </div>
  );
}

function HoldCountdown({ expiresAt, onExpire }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000)));
  useEffect(() => {
    const t = window.setInterval(() => {
      const s = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        window.clearInterval(t);
        onExpire();
      }
    }, 1000);
    return () => window.clearInterval(t);
  }, [expiresAt, onExpire]);
  const total = 300;
  const frac = left / total;
  const r = 26;
  const circ = 2 * Math.PI * r;
  const mm = String(Math.floor(left / 60)).padStart(1, '0');
  const ss = String(left % 60).padStart(2, '0');
  return (
    <div className="hold-ring" role="timer" aria-live="off" aria-label={`Hold expires in ${mm} minutes ${ss} seconds`}>
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={r} className="ring-track" />
        <circle
          cx="32"
          cy="32"
          r={r}
          className="ring-fill"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
        />
      </svg>
      <span className="ring-text">
        {mm}:{ss}
      </span>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home');
  const [eventId, setEventId] = useState(null);
  const [toast, setToast] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liveFeed, setLiveFeed] = useState([]);
  const socketRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 5000);
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api.notifications();
      setNotifications(data.notifications || []);
    } catch {
      /* notifications are a nice-to-have; a failure must not block the app */
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('gatherly_token');
    if (!token) return;
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => setToken(null));
  }, []);

  useEffect(() => {
    const socket = io('/', { auth: { userId: user?.id } });
    socketRef.current = socket;
    socket.on('notification', (note) => {
      setNotifications((prev) => [{ ...note, read: false }, ...prev].slice(0, 30));
      showToast(note.message);
    });
    socket.on('booking-live', (item) => {
      setLiveFeed((prev) => [{ ...item, key: `${item.eventId}-${item.at}` }, ...prev].slice(0, 5));
    });
    return () => socket.disconnect();
  }, [user, showToast]);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
  }, [user, loadNotifications]);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.round((h.scrollTop / max) * 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (v, id = null) => {
    setView(v);
    if (id) setEventId(id);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  };

  const signOut = () => {
    setToken(null);
    setUser(null);
    setNotifications([]);
    go('home');
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <>
      <Cursor />
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <div className="scroll-progress" style={{ width: `${progress}%` }} aria-hidden="true" />
      <header className="nav">
        <a className="nav-brand" href="#main" onClick={(e) => { e.preventDefault(); go('home'); }}>
          <span className="mark" aria-hidden="true">▦</span> Gatherly
        </a>
        <button
          type="button"
          className="nav-menu-btn"
          aria-expanded={menuOpen}
          aria-label="Toggle navigation menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          ☰
        </button>
        <nav className={`nav-links ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
          <button type="button" className={view === 'home' ? 'active' : ''} onClick={() => go('home')}>
            Home
          </button>
          <button type="button" className={view === 'events' ? 'active' : ''} onClick={() => go('events')}>
            Browse events
          </button>
          {user?.role === 'attendee' && (
            <button type="button" className={view === 'mine' ? 'active' : ''} onClick={() => go('mine')}>
              My tickets
            </button>
          )}
          {user?.role === 'organizer' && (
            <button type="button" className={view === 'organizer' ? 'active' : ''} onClick={() => go('organizer')}>
              Organizer dashboard
            </button>
          )}
          {user?.role === 'admin' && (
            <button type="button" className={view === 'admin' ? 'active' : ''} onClick={() => go('admin')}>
              Admin analytics
            </button>
          )}
          {!user && (
            <button type="button" className={view === 'auth' ? 'active' : ''} onClick={() => go('auth')}>
              Sign in
            </button>
          )}
        </nav>
        {user && (
          <>
            <button
              type="button"
              className="bell"
              aria-label={`Notifications, ${unread} unread`}
              onClick={() => setShowNotifs(true)}
            >
              🔔{unread > 0 && <span className="dot" aria-hidden="true" />}
            </button>
            <span className="nav-user">
              {user.name} · {user.role}
              <button type="button" onClick={signOut}>Sign out</button>
            </span>
          </>
        )}
        {!user && (
          <button type="button" className="nav-cta" onClick={() => go('auth')}>
            Get tickets
          </button>
        )}
      </header>

      <main id="main">
        {view === 'home' && <Home user={user} go={go} liveFeed={liveFeed} />}
        {view === 'events' && <EventList user={user} go={go} showToast={showToast} />}
        {view === 'event' && <EventDetail user={user} go={go} eventId={eventId} showToast={showToast} socketRef={socketRef} />}
        {view === 'mine' && <MyTickets user={user} go={go} showToast={showToast} />}
        {view === 'organizer' && <OrganizerDashboard user={user} showToast={showToast} />}
        {view === 'admin' && <AdminView showToast={showToast} />}
        {view === 'auth' && <AuthView onSignedIn={(u) => { setUser(u); go(u.role === 'organizer' ? 'organizer' : u.role === 'admin' ? 'admin' : 'events'); }} showToast={showToast} />}
      </main>

      <footer>
        <div className="wrap">
          <div>
            <strong>Gatherly</strong>
            <p className="muted" style={{ margin: '6px 0 0', fontSize: '.92rem' }}>
              Demo event ticketing app. All events, venues and artists shown here are fictional demo data.
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '.92rem' }}>© 2026 Akhand</p>
          </div>
          <nav aria-label="Footer navigation">
            <button type="button" onClick={() => go('home')}>Home</button>
            <button type="button" onClick={() => go('events')}>Browse events</button>
            <button type="button" onClick={() => window.scrollTo({ top: 0 })}>Back to top ↑</button>
          </nav>
        </div>
      </footer>

      {showNotifs && (
        <Dialog title="Notifications" onClose={() => setShowNotifs(false)}>
          {notifications.length === 0 ? (
            <p className="muted">No notifications yet. Bookings, cancellations and waitlist promotions appear here live.</p>
          ) : (
            <ul className="notif-list">
              {notifications.map((n) => (
                <li key={n.id} className={n.read ? '' : 'unread'}>
                  {n.message}
                  <time>{n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN') : ''}</time>
                </li>
              ))}
            </ul>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 16 }}
              onClick={async () => { await api.readNotifications(); loadNotifications(); }}
            >
              Mark all as read
            </button>
          )}
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}

function previewSeats() {
  // Illustrative preview only — fabricated states for the hero seat map.
  const seats = [];
  for (const zone of config.defaultZones) {
    for (const row of zone.rows) {
      for (let n = 1; n <= row.count; n += 1) {
        const id = `${row.label}${n}`;
        let state = 'available';
        if (['A1', 'A2', 'B1', 'C3', 'F5', 'F6', 'G8'].includes(id)) state = 'booked';
        if (['B4', 'D2', 'H3'].includes(id)) state = 'held';
        seats.push({ id, zone: zone.name, price: zone.price, row: row.label, number: n, state, mine: false });
      }
    }
  }
  return seats;
}

function Home({ user, go, liveFeed }) {
  const [events, setEvents] = useState([]);
  const [soldTotal, setSoldTotal] = useState(0);

  useEffect(() => {
    api.events().then((d) => {
      const list = d.events || [];
      setEvents(list);
      setSoldTotal(list.reduce((n, e) => n + (e.sold || 0), 0));
    }).catch(() => {});
  }, []);

  const featured = events.slice(0, 3);
  const previewEvent = { title: 'Seat map preview', zones: config.defaultZones };

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-left">
          <p className="eyebrow"><span className="num">(01)</span> {copy.heroEyebrow}</p>
          <h1 id="hero-title">
            {copy.heroHeadline} <em>{copy.heroEmphasis}</em>
          </h1>
          <p className="lede">{copy.heroText}</p>
          <div className="hero-ctas">
            <button type="button" className="btn btn-primary" onClick={() => go('events')}>
              Browse events →
            </button>
            <button type="button" className="btn" onClick={() => go(user ? 'mine' : 'auth')}>
              {user ? 'My tickets' : 'Sign in'}
            </button>
          </div>
          <div className="hero-stat" aria-label="Platform summary">
            <div><b>{events.length || '—'}</b><span>events listed</span></div>
            <div><b>{config.cities.length}</b><span>cities</span></div>
            <div><b>{soldTotal}</b><span>tickets sold (demo data)</span></div>
          </div>
        </div>
        <div className="hero-right">
          <p className="eyebrow" style={{ color: '#bef264' }}><span className="num">(02)</span> The seat map</p>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}>
            Pick the exact seat, <em>not a zone.</em>
          </h2>
          <p className="muted" style={{ color: '#b8b0a2', marginTop: 10 }}>
            Illustrative preview — a coded seat map, not a screenshot. VIP up front by the stage, Standard at the back.
          </p>
          <div className="hero-seatmap">
            <SeatMap event={previewEvent} seats={previewSeats()} selected={['C5', 'C6']} interactive={false} />
          </div>
        </div>
      </section>

      <div className="ticker" aria-label="Live booking activity" aria-live="off">
        <span className="ticker-label">Live</span>
        {liveFeed.length === 0 ? (
          <span className="ticker-item">No bookings in this session yet — confirm a booking and it appears here live.</span>
        ) : (
          liveFeed.map((item) => (
            <span className="ticker-item" key={item.key}>
              {item.seats} seat{item.seats > 1 ? 's' : ''} booked for {item.title}
            </span>
          ))
        )}
      </div>

      <section aria-labelledby="featured-title">
        <div className="wrap">
          <p className="eyebrow"><span className="num">(03)</span> Coming up</p>
          <h2 id="featured-title">Next on the <em>calendar.</em></h2>
          {featured.length === 0 ? (
            <p className="empty">No events listed yet.</p>
          ) : (
            <div className="event-list">
              {featured.map((e, i) => (
                <Reveal key={e.id} className="event-row-wrap">
                  <article className="event-row">
                    <span className="idx" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <h3>{e.title}</h3>
                      <p className="sub">{formatDateTime(e.date)} · {e.venue}, {e.city}</p>
                      <span className="chip">{e.category}</span>
                      {e.demo && <span className="chip chip-demo">Demo event</span>}
                    </div>
                    <div className="occ-col">
                      <OccupancyBar sold={e.sold} total={e.totalSeats} />
                      <span className="muted" style={{ fontSize: '.85rem' }}>{e.available} of {e.totalSeats} seats left</span>
                    </div>
                    <div className="fee">{inr(Math.min(...e.zones.map((z) => z.price)))}<span>from</span></div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => go('event', e.id)}>
                      View seats →
                    </button>
                  </article>
                </Reveal>
              ))}
            </div>
          )}
          <div style={{ marginTop: 28 }}>
            <button type="button" className="btn" onClick={() => go('events')}>See all events →</button>
          </div>
        </div>
      </section>

      <section aria-labelledby="how-title">
        <div className="wrap">
          <p className="eyebrow"><span className="num">(04)</span> How it works</p>
          <h2 id="how-title">Three steps to <em>your seat.</em></h2>
          <div className="how">
            {copy.howItWorks.map((s) => (
              <Reveal key={s.n}>
                <article>
                  <span className="n">{s.n}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="dark" aria-labelledby="soldout-title">
        <div className="wrap">
          <p className="eyebrow" style={{ color: '#bef264' }}><span className="num">(05)</span> Sold out? Not quite</p>
          <h2 id="soldout-title">Join the waitlist, <em>get the seat.</em></h2>
          <p className="lede" style={{ marginTop: 16 }}>
            When an event sells out, join its waitlist. The moment someone cancels, the first
            person waiting is notified live and can book the freed seats before anyone else.
          </p>
          <div style={{ marginTop: 28 }}>
            <button type="button" className="btn btn-primary" onClick={() => go('events')}>
              Browse events →
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function EventList({ user, go, showToast }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (category) params.category = category;
      if (city) params.city = city;
      if (date) params.date = date;
      if (q) params.search = q;
      const data = await api.events(params);
      setEvents(data.events || []);
    } catch (e) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  }, [category, city, date, q, showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <section aria-labelledby="browse-title">
      <div className="wrap">
        <p className="eyebrow"><span className="num">(01)</span> Browse</p>
        <h1 id="browse-title" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
          Every event, <em>every seat.</em>
        </h1>
        <p className="lede" style={{ marginTop: 14 }}>
          Demo listing — every event shown is fictional demo data seeded for trying the app.
        </p>

        <div className="filters" role="search">
          <div className="field grow">
            <label htmlFor="f-q">Search title, venue or city</label>
            <input id="f-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. comedy, Lucknow" />
          </div>
          <div className="field">
            <label htmlFor="f-cat">Category</label>
            <select id="f-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {config.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-city">City</label>
            <select id="f-city" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All cities</option>
              {config.cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-date">Date</label>
            <input id="f-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <p className="muted">Loading events…</p>
        ) : events.length === 0 ? (
          <p className="empty">No events match those filters. Try clearing the search or date.</p>
        ) : (
          <div className="event-list">
            {events.map((e, i) => {
              const pct = e.totalSeats ? Math.round((e.sold / e.totalSeats) * 100) : 0;
              return (
                <article className="event-row" key={e.id} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                  <span className="idx" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{e.title}</h3>
                    <p className="sub">{formatDateTime(e.date)} · {e.venue}, {e.city}</p>
                    <p className="sub">{e.description}</p>
                    <span className="chip">{e.category}</span>
                    {e.demo && <span className="chip chip-demo">Demo event</span>}
                    {pct >= 80 && e.available > 0 && <span className="chip chip-hot">Selling fast</span>}
                    {e.available === 0 && <span className="chip chip-sold">Sold out</span>}
                  </div>
                  <div className="occ-col">
                    <OccupancyBar sold={e.sold} total={e.totalSeats} />
                    <span className="muted" style={{ fontSize: '.85rem' }}>{e.available} of {e.totalSeats} seats left</span>
                  </div>
                  <div className="fee">{inr(Math.min(...e.zones.map((z) => z.price)))}<span>from</span></div>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => go('event', e.id)}>
                    {e.available === 0 ? 'Join waitlist' : 'View seats →'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function EventDetail({ user, go, eventId, showToast, socketRef }) {
  const [event, setEvent] = useState(null);
  const [seatData, setSeatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [hold, setHold] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [waitlistBusy, setWaitlistBusy] = useState(false);

  const loadSeats = useCallback(async () => {
    try {
      const d = await api.eventSeats(eventId);
      setSeatData(d);
      // Drop selections that are no longer available.
      setSelected((prev) => prev.filter((id) => {
        const s = d.seats.find((x) => x.id === id);
        return s && (s.state === 'available' || (s.state === 'held' && s.mine));
      }));
    } catch (e) {
      setError(e.message);
    }
  }, [eventId]);

  useEffect(() => {
    setLoading(true);
    api.event(eventId)
      .then((d) => setEvent(d.event))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    loadSeats();
    const socket = socketRef.current;
    if (socket) {
      socket.emit('watch-event', eventId);
      socket.on('seats-updated', (payload) => {
        if (String(payload.eventId) === String(eventId)) loadSeats();
      });
    }
    return () => {
      if (socket) {
        socket.emit('unwatch-event', eventId);
        socket.off('seats-updated');
      }
    };
  }, [eventId, loadSeats, socketRef]);

  const toggleSeat = (seat) => {
    if (hold) return;
    setSelected((prev) => {
      if (prev.includes(seat.id)) return prev.filter((s) => s !== seat.id);
      if (prev.length >= 6) {
        showToast('At most 6 seats per booking.');
        return prev;
      }
      return [...prev, seat.id];
    });
  };

  const selectedTotal = selected.reduce((n, id) => {
    const s = seatData?.seats.find((x) => x.id === id);
    return n + (s?.price || 0);
  }, 0);

  const holdSeats = async () => {
    if (!user) { go('auth'); return; }
    if (user.role !== 'attendee') { showToast('Sign in as an attendee to book seats.'); return; }
    if (!selected.length) return;
    setBusy(true);
    setError('');
    try {
      const data = await api.holdSeats({ eventId, seatIds: selected });
      setHold(data.booking);
      setSelected([]);
      showToast(`Held for 5 minutes — confirm before the countdown ends.`);
    } catch (e) {
      setError(e.message);
      loadSeats();
    } finally {
      setBusy(false);
    }
  };

  const cancelHold = async () => {
    if (!hold) return;
    try {
      await api.cancelBooking(hold.id);
      setHold(null);
      showToast('Hold released — the seats are free again.');
      loadSeats();
    } catch (e) {
      setError(e.message);
    }
  };

  const confirmBooking = async () => {
    if (!hold) return;
    setConfirming(true);
    setError('');
    try {
      const data = await api.confirmBooking(hold.id, { paymentMethod: 'demo' });
      setConfirmed(data.booking);
      setHold(null);
      setShowCheckout(false);
      loadSeats();
    } catch (e) {
      setError(e.message);
      setShowCheckout(false);
      if (e.message.includes('expired')) setHold(null);
      loadSeats();
    } finally {
      setConfirming(false);
    }
  };

  const joinWaitlist = async () => {
    if (!user) { go('auth'); return; }
    setWaitlistBusy(true);
    setError('');
    try {
      await api.joinWaitlist(eventId);
      showToast('You are on the waitlist. We will notify you live if seats open up.');
    } catch (e) {
      setError(e.message);
    } finally {
      setWaitlistBusy(false);
    }
  };

  if (loading) {
    return <section><div className="wrap"><p className="muted">Loading event…</p></div></section>;
  }
  if (!event) {
    return (
      <section><div className="wrap">
        <p className="alert" role="alert">{error || 'Event not found.'}</p>
        <button type="button" className="btn" onClick={() => go('events')}>Back to events</button>
      </div></section>
    );
  }

  const soldOut = seatData ? seatData.available === 0 : event.available === 0;

  return (
    <section aria-labelledby="event-title">
      <div className="wrap">
        <p className="eyebrow"><span className="num">(01)</span> {event.category} · {event.city}</p>
        <h1 id="event-title" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
          {event.title}
        </h1>
        <p className="lede" style={{ marginTop: 14 }}>
          {formatDateTime(event.date)} · {event.venue}, {event.city} · about {Math.round((event.durationMinutes || 120) / 60)} hours
          {event.demo ? ' · Demo event (fictional)' : ''}
        </p>
        <p style={{ maxWidth: '70ch' }}>{event.description}</p>
        <div className="zone-strip" aria-label="Zone pricing">
          {event.zones.map((z) => (
            <span key={z.name}><strong>{z.name}</strong> {inr(z.price)}</span>
          ))}
          <span><strong>Availability</strong> {seatData ? `${seatData.available} of ${seatData.total} seats left` : `${event.available} of ${event.totalSeats} left`}</span>
        </div>

        {error && <p className="alert" role="alert">{error}</p>}

        {soldOut && !hold && !confirmed ? (
          <div className="soldout-box">
            <h2 style={{ fontSize: '1.6rem' }}>Sold out — <em>join the waitlist.</em></h2>
            <p className="muted">Every seat is taken. Join the waitlist and we notify you live if someone cancels.</p>
            <button type="button" className="btn btn-primary" disabled={waitlistBusy} onClick={joinWaitlist}>
              {waitlistBusy ? 'Joining…' : 'Join waitlist'}
            </button>
          </div>
        ) : (
          <>
            <div className="seatmap-panel">
              <SeatMap event={event} seats={seatData?.seats || []} selected={selected} onToggle={toggleSeat} interactive={!hold} />
            </div>
            <div className="booking-bar" aria-live="polite">
              {hold ? (
                <>
                  <HoldCountdown
                    expiresAt={hold.holdExpiresAt}
                    onExpire={() => {
                      setHold(null);
                      showToast('Your hold expired and the seats were released.');
                      loadSeats();
                    }}
                  />
                  <div>
                    <strong>{hold.seats.length} seat{hold.seats.length > 1 ? 's' : ''} on hold — {hold.seats.join(', ')}</strong>
                    <p className="muted" style={{ margin: '2px 0 0' }}>Total {inr(hold.totalAmount)} · confirm before the countdown ends.</p>
                  </div>
                  <div className="booking-actions">
                    <button type="button" className="btn btn-primary" onClick={() => setShowCheckout(true)}>
                      Confirm — {inr(hold.totalAmount)}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={cancelHold}>Release hold</button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <strong>
                      {selected.length === 0
                        ? 'Click seats on the map to select them'
                        : `${selected.length} seat${selected.length > 1 ? 's' : ''} selected — ${selected.join(', ')}`}
                    </strong>
                    <p className="muted" style={{ margin: '2px 0 0' }}>
                      {selected.length > 0 ? `Total ${inr(selectedTotal)} · at most 6 seats per booking` : 'VIP up front, Standard at the back. Held seats release after 5 minutes.'}
                    </p>
                  </div>
                  <div className="booking-actions">
                    <button type="button" className="btn btn-primary" disabled={busy || selected.length === 0} onClick={holdSeats}>
                      {busy ? 'Holding…' : `Hold ${selected.length} seat${selected.length === 1 ? '' : 's'} — ${inr(selectedTotal)}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {showCheckout && hold && (
          <Dialog title="Mock checkout" onClose={() => setShowCheckout(false)}>
            <p className="muted" style={{ marginTop: 0 }}>
              This is a <strong>mock checkout</strong> — no real payment is taken and no card details are asked for.
            </p>
            <hr className="rule" />
            <p><strong>Event:</strong> {event.title}</p>
            <p><strong>Seats:</strong> {hold.seats.join(', ')}</p>
            <p><strong>Total (computed by the server):</strong> {inr(hold.totalAmount)}</p>
            {error && <p className="alert" role="alert">{error}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
              <button type="button" className="btn btn-primary" disabled={confirming} onClick={confirmBooking}>
                {confirming ? 'Confirming…' : `Confirm with demo payment — ${inr(hold.totalAmount)}`}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowCheckout(false)}>Back</button>
            </div>
          </Dialog>
        )}

        {confirmed && (
          <Dialog title="You are in — e-tickets ready" onClose={() => { setConfirmed(null); go('mine'); }}>
            <p className="muted" style={{ marginTop: 0 }}>
              Booking confirmed for {event.title}. Show a ticket code at the door — each seat has its own code.
            </p>
            <ul className="ticket-list">
              {confirmed.tickets.map((t) => (
                <li key={t.code}>
                  <span>Seat <strong>{t.seatId}</strong></span>
                  <code>{t.code}</code>
                </li>
              ))}
            </ul>
            <p><strong>Total paid (mock):</strong> {inr(confirmed.totalAmount)}</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="button" className="btn btn-primary" onClick={() => { setConfirmed(null); go('mine'); }}>
                View my tickets →
              </button>
            </div>
          </Dialog>
        )}
      </div>
    </section>
  );
}

function MyTickets({ user, go, showToast }) {
  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, w] = await Promise.all([api.myBookings(), api.myWaitlist()]);
      setBookings(b.bookings || []);
      setWaitlist((w.waitlist || []).filter((e) => e.status === 'waiting'));
    } catch (e) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  if (!user) {
    return (
      <section><div className="wrap">
        <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>My tickets</h1>
        <p className="lede" style={{ marginTop: 14 }}>Sign in to see your tickets.</p>
        <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => go('auth')}>Sign in</button>
      </div></section>
    );
  }

  const active = bookings.filter((b) => b.status === 'confirmed');
  const past = bookings.filter((b) => b.status !== 'confirmed');
  const shown = filter === 'active' ? active : past;

  const cancel = async (id) => {
    try {
      const res = await api.cancelBooking(id);
      showToast(res.promoted ? 'Cancelled. Your seats went to the first person on the waitlist.' : 'Booking cancelled — seats released.');
      load();
    } catch (e) {
      showToast(e.message);
    }
  };

  return (
    <section aria-labelledby="mine-title">
      <div className="wrap">
        <p className="eyebrow"><span className="num">(01)</span> Attendee records</p>
        <h1 id="mine-title" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
          My tickets <em>&amp; bookings.</em>
        </h1>
        <div className="filters">
          <button type="button" className={`btn btn-sm ${filter === 'active' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setFilter('active')}>
            Active ({active.length})
          </button>
          <button type="button" className={`btn btn-sm ${filter === 'past' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setFilter('past')}>
            Past &amp; cancelled ({past.length})
          </button>
        </div>

        {loading ? (
          <p className="muted">Loading tickets…</p>
        ) : shown.length === 0 ? (
          <p className="empty">
            {filter === 'active' ? 'No active tickets. Browse events and pick your seats.' : 'No past bookings yet.'}
          </p>
        ) : (
          shown.map((b) => (
            <article className="ticket-row" key={b.id}>
              <div className="when">
                {formatDate(b.event?.date)}
                <span>{b.event?.venue}, {b.event?.city}</span>
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>{b.event?.title}</h3>
                <p className="muted" style={{ margin: '4px 0' }}>
                  Seats {b.seats.join(', ')} · {inr(b.totalAmount)}{b.paymentMethod ? ' · mock checkout' : ''}
                </p>
                <p><span className={`status ${b.status}`}>{b.status}</span>{b.fromWaitlist ? ' · from waitlist' : ''}</p>
                {b.tickets?.length > 0 && (
                  <ul className="ticket-list" style={{ marginTop: 12 }}>
                    {b.tickets.map((t) => (
                      <li key={t.code}>
                        <span>Seat <strong>{t.seatId}</strong>{t.checkedIn ? ' · checked in ✓' : ''}</span>
                        <code>{t.code}</code>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="appt-actions">
                {b.status === 'confirmed' && (
                  <button type="button" className="btn btn-sm" onClick={() => cancel(b.id)}>Cancel booking</button>
                )}
                {b.status === 'held' && (
                  <span className="muted" style={{ fontSize: '.9rem' }}>
                    Hold expires {b.holdExpiresAt ? new Date(b.holdExpiresAt).toLocaleTimeString('en-IN') : ''}
                  </span>
                )}
              </div>
            </article>
          ))
        )}

        {waitlist.length > 0 && (
          <>
            <h2 style={{ fontSize: '1.5rem', marginTop: 48 }}>My waitlist</h2>
            {waitlist.map((w) => (
              <div className="ticket-row" key={w.id}>
                <div className="when">{formatDate(w.event?.date)}<span>waiting</span></div>
                <div>
                  <h3 style={{ fontSize: '1.2rem' }}>{w.event?.title}</h3>
                  <p className="muted" style={{ margin: '4px 0' }}>{w.event?.venue}, {w.event?.city} · joined {new Date(w.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="appt-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={async () => { try { await api.leaveWaitlist(w.id); showToast('Left the waitlist.'); load(); } catch (e) { showToast(e.message); } }}
                  >
                    Leave waitlist
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

function OrganizerDashboard({ user, showToast }) {
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventBookings, setEventBookings] = useState([]);
  const [checkCode, setCheckCode] = useState('');
  const [checkResult, setCheckResult] = useState('');
  const [checkError, setCheckError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, a, b, w] = await Promise.all([
        api.organizerEvents(),
        api.organizerAnalytics(),
        api.organizerBookings(),
        api.organizerWaitlist(),
      ]);
      setEvents(e.events || []);
      setAnalytics(a);
      setBookings(b.bookings || []);
      setWaitlist(w.waitlist || []);
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  if (!user || user.role !== 'organizer') {
    return (
      <section><div className="wrap">
        <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>Organizer dashboard</h1>
        <p className="lede" style={{ marginTop: 14 }}>Sign in with an organizer account to open this dashboard.</p>
      </div></section>
    );
  }

  const checkin = async (e) => {
    e.preventDefault();
    setCheckResult('');
    setCheckError('');
    try {
      const data = await api.checkin(checkCode.trim());
      setCheckResult(data.message || 'Checked in.');
      setCheckCode('');
      load();
    } catch (err) {
      setCheckError(err.message);
    }
  };

  const viewEventBookings = async (ev) => {
    setSelectedEvent(ev);
    try {
      const data = await api.eventBookings(ev.id);
      setEventBookings(data.bookings || []);
    } catch (err) {
      showToast(err.message);
    }
  };

  return (
    <section aria-labelledby="org-title">
      <div className="wrap">
        <p className="eyebrow"><span className="num">(01)</span> Organizer dashboard</p>
        <h1 id="org-title" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
          Your events, <em>live.</em>
        </h1>
        <p className="lede" style={{ marginTop: 14 }}>
          Create events with tiered zone pricing, watch sales as they happen, and check tickets in by code.
        </p>

        <div className="filters">
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create event</button>
          <button type="button" className="btn btn-ghost" onClick={load}>Refresh</button>
        </div>

        {loading ? (
          <p className="muted">Loading your dashboard…</p>
        ) : (
          <>
            {analytics && (
              <div className="stats-strip">
                <div className="stat"><b>{analytics.totals.events}</b><span>events</span></div>
                <div className="stat"><b>{analytics.totals.ticketsSold}</b><span>tickets sold</span></div>
                <div className="stat"><b>{inr(analytics.totals.revenue)}</b><span>revenue (mock checkout)</span></div>
                <div className="stat"><b>{analytics.totals.waiting}</b><span>people on waitlists</span></div>
              </div>
            )}

            <h2 style={{ fontSize: '1.5rem' }}>Sales per event</h2>
            <div className="bar-chart">
              {analytics?.perEvent.map((p) => {
                const max = Math.max(1, ...analytics.perEvent.map((x) => x.revenue));
                return (
                  <div className="bar-row" key={p.eventId}>
                    <span>{p.event}</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(p.revenue / max) * 100}%` }} /></div>
                    <strong>{inr(p.revenue)}</strong>
                  </div>
                );
              })}
              {(!analytics || analytics.perEvent.length === 0) && <p className="muted">No sales yet.</p>}
            </div>

            <h2 style={{ fontSize: '1.5rem', marginTop: 48 }}>My events</h2>
            {events.length === 0 ? (
              <p className="empty">No events yet — create your first one above.</p>
            ) : (
              events.map((e) => (
                <article className="event-row" key={e.id}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem' }}>{e.title}</h3>
                    <p className="sub">{formatDateTime(e.date)} · {e.venue}, {e.city}</p>
                    <span className="chip">{e.category}</span>
                    <span className={`status ${e.status === 'published' ? 'confirmed' : 'cancelled'}`} style={{ marginLeft: 10 }}>{e.status}</span>
                  </div>
                  <div className="occ-col">
                    <OccupancyBar sold={e.sold} total={e.totalSeats} />
                    <span className="muted" style={{ fontSize: '.85rem' }}>{e.sold} sold · {inr(e.revenue)} revenue</span>
                  </div>
                  <div className="appt-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => viewEventBookings(e)}>Bookings</button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => { setSelectedEvent(e); setEventBookings([]); viewEventBookings(e); }}>
                      Check-in
                    </button>
                  </div>
                </article>
              ))
            )}

            {selectedEvent && (
              <div style={{ marginTop: 32 }}>
                <h2 style={{ fontSize: '1.5rem' }}>Bookings — {selectedEvent.title}</h2>
                <form className="filters" onSubmit={checkin} style={{ marginTop: 16 }}>
                  <div className="field grow">
                    <label htmlFor="check-code">Check in a ticket by code</label>
                    <input id="check-code" value={checkCode} onChange={(e) => setCheckCode(e.target.value)} placeholder="e.g. GT-ABC123" />
                  </div>
                  <button type="submit" className="btn btn-primary">Check in</button>
                </form>
                {checkResult && <p className="alert ok" role="status">{checkResult}</p>}
                {checkError && <p className="alert" role="alert">{checkError}</p>}
                {eventBookings.length === 0 ? (
                  <p className="empty">No bookings for this event yet.</p>
                ) : (
                  <table className="util-table">
                    <thead><tr><th>Attendee</th><th>Seats</th><th>Status</th><th>Total</th><th>Checked in</th></tr></thead>
                    <tbody>
                      {eventBookings.map((b) => (
                        <tr key={b.id}>
                          <td>{b.user?.name || '—'}<br /><span className="muted" style={{ fontSize: '.85rem' }}>{b.user?.email || ''}</span></td>
                          <td>{b.seats.join(', ')}</td>
                          <td><span className={`status ${b.status}`}>{b.status}</span></td>
                          <td>{inr(b.totalAmount)}</td>
                          <td>{b.tickets.filter((t) => t.checkedIn).length} / {b.tickets.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            <h2 style={{ fontSize: '1.5rem', marginTop: 48 }}>Waitlist for your events</h2>
            {waitlist.length === 0 ? (
              <p className="empty">Nobody is waiting for your events right now.</p>
            ) : (
              waitlist.map((w) => (
                <div className="ticket-row" key={w.id}>
                  <div className="when">{formatDate(w.event?.date)}<span>waiting</span></div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem' }}>{w.user?.name}</h3>
                    <p className="muted" style={{ margin: '4px 0' }}>{w.event?.title} · {w.user?.email} · waiting since {new Date(w.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="appt-actions">
                    <span className="muted" style={{ fontSize: '.9rem' }}>Auto-promoted on the next cancellation</span>
                  </div>
                </div>
              ))
            )}

            <h2 style={{ fontSize: '1.5rem', marginTop: 48 }}>Recent bookings across your events</h2>
            {bookings.length === 0 ? (
              <p className="empty">No bookings yet.</p>
            ) : (
              bookings.slice(0, 10).map((b) => (
                <div className="ticket-row" key={b.id}>
                  <div className="when">{formatDate(b.createdAt)}<span>{b.event?.title}</span></div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem' }}>{b.user?.name}</h3>
                    <p className="muted" style={{ margin: '4px 0' }}>Seats {b.seats.join(', ')} · {inr(b.totalAmount)}</p>
                    <p><span className={`status ${b.status}`}>{b.status}</span></p>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateEventDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); showToast('Event created.'); load(); }}
          showToast={showToast}
        />
      )}
    </section>
  );
}

function CreateEventDialog({ onClose, onCreated, showToast }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Music');
  const [city, setCity] = useState('Azamgarh');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState(120);
  const [description, setDescription] = useState('');
  const [prices, setPrices] = useState({ VIP: 1499, Premium: 899, Standard: 499 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !venue.trim() || !date) {
      setError('Title, venue and date are required.');
      return;
    }
    setBusy(true);
    try {
      const zones = config.defaultZones.map((z) => ({
        ...z,
        price: Number(prices[z.name]) || 0,
      }));
      await api.createEvent({
        title: title.trim(),
        category,
        city,
        venue: venue.trim(),
        description: description.trim(),
        date: new Date(date).toISOString(),
        durationMinutes: Number(duration),
        zones,
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title="Create an event" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Uses the default tiered layout: VIP rows A–B, Premium C–E, Standard F–I (94 seats). Set your own zone prices below.
      </p>
      <form className="form-stack" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="ce-title">Event title</label>
          <input id="ce-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Winter Jazz Evening" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="ce-cat">Category</label>
            <select id="ce-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              {config.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ce-city">City</label>
            <select id="ce-city" value={city} onChange={(e) => setCity(e.target.value)}>
              {config.cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="ce-venue">Venue</label>
          <input id="ce-venue" value={venue} onChange={(e) => setVenue(e.target.value)} required placeholder="e.g. Riverside Open Ground" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="ce-date">Date &amp; time</label>
            <input id="ce-date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="ce-dur">Duration (minutes)</label>
            <input id="ce-dur" type="number" min="15" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="ce-desc">Description</label>
          <textarea id="ce-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happens at this event?" />
        </div>
        <fieldset className="price-fieldset">
          <legend>Zone prices (₹)</legend>
          {config.defaultZones.map((z) => (
            <div className="field" key={z.name}>
              <label htmlFor={`ce-price-${z.name}`}>{z.name} — rows {z.rows.map((r) => r.label).join(', ')}</label>
              <input
                id={`ce-price-${z.name}`}
                type="number"
                min="0"
                value={prices[z.name]}
                onChange={(e) => setPrices({ ...prices, [z.name]: e.target.value })}
              />
            </div>
          ))}
        </fieldset>
        {error && <p className="alert" role="alert">{error}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create event'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Dialog>
  );
}

function AdminView({ showToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminAnalytics().then(setData).catch((e) => showToast(e.message)).finally(() => setLoading(false));
  }, [showToast]);

  if (loading) {
    return <section><div className="wrap"><p className="muted">Loading analytics…</p></div></section>;
  }
  if (!data) {
    return <section><div className="wrap"><p className="alert">Analytics could not be loaded.</p></div></section>;
  }

  const maxRev = Math.max(1, ...data.revenueByEvent.map((r) => r.revenue));
  const maxTrend = Math.max(1, ...data.ticketsPerDay.map((t) => t.tickets));

  return (
    <section aria-labelledby="admin-title">
      <div className="wrap">
        <p className="eyebrow"><span className="num">(01)</span> Admin analytics</p>
        <h1 id="admin-title" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
          The platform, <em>in numbers.</em>
        </h1>
        <p className="lede" style={{ marginTop: 14 }}>
          Computed live from real bookings in the database — including the seeded demo bookings.
        </p>

        <div className="stats-strip">
          <div className="stat"><b>{data.totals.events}</b><span>events</span></div>
          <div className="stat"><b>{data.totals.users}</b><span>users</span></div>
          <div className="stat"><b>{data.totals.ticketsSold}</b><span>tickets sold</span></div>
          <div className="stat"><b>{inr(data.totals.revenue)}</b><span>revenue (mock checkout)</span></div>
        </div>

        <h2 style={{ fontSize: '1.5rem' }}>Revenue by event</h2>
        <div className="bar-chart">
          {data.revenueByEvent.map((r) => (
            <div className="bar-row" key={r.event}>
              <span>{r.event}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(r.revenue / maxRev) * 100}%` }} /></div>
              <strong>{inr(r.revenue)}</strong>
            </div>
          ))}
          {data.revenueByEvent.length === 0 && <p className="muted">No confirmed bookings yet.</p>}
        </div>

        <h2 style={{ fontSize: '1.5rem', marginTop: 48 }}>Occupancy per event</h2>
        <table className="util-table">
          <thead><tr><th>Event</th><th>City</th><th>Date</th><th>Sold</th><th>Seats</th><th>Occupancy</th></tr></thead>
          <tbody>
            {data.occupancy.map((o) => (
              <tr key={o.event}>
                <td>{o.event}</td><td>{o.city}</td><td>{formatDate(o.date)}</td><td>{o.sold}</td><td>{o.total}</td><td><strong>{o.rate}%</strong></td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 style={{ fontSize: '1.5rem', marginTop: 48 }}>Tickets sold per day</h2>
        <div className="bar-chart">
          {data.ticketsPerDay.map((t) => (
            <div className="bar-row" key={t.date}>
              <span>{formatDate(t.date)}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(t.tickets / maxTrend) * 100}%` }} /></div>
              <strong>{t.tickets}</strong>
            </div>
          ))}
          {data.ticketsPerDay.length === 0 && <p className="muted">No bookings recorded yet.</p>}
        </div>
      </div>
    </section>
  );
}

function AuthView({ onSignedIn, showToast }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('attendee');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      let data;
      if (mode === 'login') {
        data = await api.login({ email, password });
      } else {
        data = await api.register({ name, email, password, role });
      }
      setToken(data.token);
      onSignedIn(data.user);
      showToast(`Welcome, ${data.user.name}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const demoLogin = async (demo) => {
    setError('');
    setBusy(true);
    try {
      const data = await api.login({ email: demo.email, password: demo.password });
      setToken(data.token);
      onSignedIn(data.user);
      showToast(`Signed in as ${demo.label} (demo account).`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="auth-title">
      <div className="wrap">
        <div className="auth-grid">
          <div>
            <p className="eyebrow"><span className="num">(01)</span> Accounts</p>
            <h1 id="auth-title" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)' }}>
              {mode === 'login' ? 'Welcome back.' : 'Create an account.'}
            </h1>
            <form className="form-stack" style={{ marginTop: 24 }} onSubmit={submit} noValidate>
              {mode === 'register' && (
                <div className="field">
                  <label htmlFor="au-name">Full name</label>
                  <input id="au-name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
                </div>
              )}
              <div className="field">
                <label htmlFor="au-email">Email</label>
                <input id="au-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="field">
                <label htmlFor="au-pass">Password {mode === 'register' && '(at least 8 characters)'}</label>
                <input id="au-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              </div>
              {mode === 'register' && (
                <div className="field">
                  <label htmlFor="au-role">I am a…</label>
                  <select id="au-role" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="attendee">Attendee — I buy tickets</option>
                    <option value="organizer">Organizer — I run events</option>
                  </select>
                </div>
              )}
              {error && <p className="alert" role="alert">{error}</p>}
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
                {mode === 'login' ? 'No account yet? Create one' : 'Already have an account? Sign in'}
              </button>
            </form>
          </div>
          <div className="auth-panel">
            <p className="eyebrow" style={{ color: '#bef264' }}><span className="num">(02)</span> Try it instantly</p>
            <h2>Demo accounts</h2>
            <p className="muted">One click signs you in — no typing. Demo data only.</p>
            <ul className="demo-list">
              {config.demoAccounts.map((d) => (
                <li key={d.email}>
                  <span><strong>{d.label}</strong><br /><code>{d.email}</code></span>
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => demoLogin(d)}>
                    Sign in
                  </button>
                </li>
              ))}
            </ul>
            <p className="muted" style={{ marginTop: 20, fontSize: '.9rem' }}>
              Admin accounts are created by the platform, not by sign-up. Use the demo admin above to see analytics.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
