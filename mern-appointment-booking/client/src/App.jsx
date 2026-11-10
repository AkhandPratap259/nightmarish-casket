import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, setToken, formatDate, formatTime, inr } from './api';
import { config, copy } from './data/config';
import Cursor from './components/Cursor';
import Dialog from './components/Dialog';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayNames(days) {
  if (!days || !days.length) return 'No fixed days';
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAYS[d])
    .join(', ');
}

function sessionText(sessions) {
  if (!sessions || !sessions.length) return '—';
  return sessions.map((s) => `${formatTime(s.start)} – ${formatTime(s.end)}`).join(' · ');
}

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home');
  const [toast, setToast] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0);
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
    const token = localStorage.getItem('medibook_token');
    if (!token) return;
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => setToken(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const socket = io('/', { auth: { userId: user.id } });
    socketRef.current = socket;
    socket.on('notification', (note) => {
      setNotifications((prev) => [{ ...note, read: false }, ...prev].slice(0, 30));
      showToast(note.message);
    });
    return () => socket.disconnect();
  }, [user, loadNotifications, showToast]);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.round((h.scrollTop / max) * 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (v) => {
    setView(v);
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
          <span className="mark" aria-hidden="true">+</span> MediBook
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
          <button type="button" className={view === 'doctors' ? 'active' : ''} onClick={() => go('doctors')}>
            Find a doctor
          </button>
          {user?.role === 'patient' && (
            <button type="button" className={view === 'mine' ? 'active' : ''} onClick={() => go('mine')}>
              My appointments
            </button>
          )}
          {user?.role === 'doctor' && (
            <button type="button" className={view === 'dashboard' ? 'active' : ''} onClick={() => go('dashboard')}>
              Doctor dashboard
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
            Book a visit
          </button>
        )}
      </header>

      <main id="main">
        {view === 'home' && <Home user={user} go={go} />}
        {view === 'doctors' && <DoctorDirectory user={user} go={go} showToast={showToast} />}
        {view === 'mine' && <MyAppointments user={user} go={go} showToast={showToast} />}
        {view === 'dashboard' && <DoctorDashboard user={user} showToast={showToast} />}
        {view === 'admin' && <AdminView showToast={showToast} />}
        {view === 'auth' && <AuthView onSignedIn={(u) => { setUser(u); go(u.role === 'doctor' ? 'dashboard' : u.role === 'admin' ? 'admin' : 'doctors'); }} showToast={showToast} />}
      </main>

      <footer>
        <div className="wrap">
          <div>
            <strong>MediBook</strong>
            <p className="muted" style={{ margin: '6px 0 0', fontSize: '.92rem' }}>
              Demo appointment booking app. Doctors and patients shown here are demo data.
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '.92rem' }}>© 2026 Akhand</p>
          </div>
          <nav aria-label="Footer navigation">
            <button type="button" onClick={() => go('home')}>Home</button>
            <button type="button" onClick={() => go('doctors')}>Find a doctor</button>
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

function Home({ user, go }) {
  const [doctors, setDoctors] = useState([]);
  const [specialities, setSpecialities] = useState([]);
  const [today, setToday] = useState([]);

  useEffect(() => {
    api.doctors().then((d) => setDoctors(d.doctors || [])).catch(() => {});
    api.specialities().then((d) => setSpecialities(d.specialities || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'doctor') return;
    const iso = new Date().toISOString().slice(0, 10);
    api.doctorDay(iso).then((d) => setToday(d.appointments || [])).catch(() => {});
  }, [user]);

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
            <button type="button" className="btn btn-primary" onClick={() => go('doctors')}>
              Find a doctor →
            </button>
            <button type="button" className="btn" onClick={() => go(user ? 'mine' : 'auth')}>
              {user ? 'My appointments' : 'Sign in'}
            </button>
          </div>
          <div className="hero-stat" aria-label="Directory summary">
            <div><b>{doctors.length || '—'}</b><span>doctors listed</span></div>
            <div><b>{specialities.length || '—'}</b><span>specialities</span></div>
            <div><b>14 days</b><span>bookable ahead</span></div>
          </div>
        </div>
        <div className="hero-right">
          {user?.role === 'doctor' ? (
            <>
              <p className="eyebrow" style={{ color: '#93b4ff' }}><span className="num">(02)</span> Today at your clinic</p>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}>
                Your day, <em>at a glance.</em>
              </h2>
              {today.length === 0 ? (
                <p className="muted">No appointments booked for today yet.</p>
              ) : (
                <ul className="today-list">
                  {today.slice(0, 6).map((a) => (
                    <li key={a.id}>
                      <span><b>{formatTime(a.time)}</b> — {a.patient?.name}</span>
                      <span className={`status ${a.status}`}>{a.status}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ marginTop: 20 }}>
                <button type="button" className="btn btn-primary" onClick={() => go('dashboard')}>
                  Open doctor dashboard →
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow" style={{ color: '#93b4ff' }}><span className="num">(02)</span> Specialities</p>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}>
                Every speciality, <em>one directory.</em>
              </h2>
              <div className="spec-index">
                {specialities.map((s) => (
                  <button key={s} type="button" onClick={() => go('doctors')}>{s}</button>
                ))}
              </div>
              <p className="muted" style={{ marginTop: 20 }}>
                Doctors set their own weekly schedule and fees. Slots are generated live from that
                schedule, so what you see is what you can book.
              </p>
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="how-title">
        <div className="wrap">
          <p className="eyebrow"><span className="num">(03)</span> How it works</p>
          <h2 id="how-title">Three steps to <em>seen.</em></h2>
          <div className="how">
            {copy.howItWorks.map((s) => (
              <article key={s.n}>
                <span className="n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="dark" aria-labelledby="waitlist-title">
        <div className="wrap">
          <p className="eyebrow" style={{ color: '#93b4ff' }}><span className="num">(04)</span> Waitlist, built in</p>
          <h2 id="waitlist-title">Full day? <em>Join the queue.</em></h2>
          <p className="lede" style={{ marginTop: 16 }}>
            When a doctor’s day is fully booked, join the waitlist for that date. The moment
            someone cancels, the first person waiting is booked into the freed slot automatically
            and notified live — no refreshing, no phone calls.
          </p>
          <div style={{ marginTop: 28 }}>
            <button type="button" className="btn btn-primary" onClick={() => go('doctors')}>
              Browse doctors →
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function DoctorDirectory({ user, go, showToast }) {
  const [doctors, setDoctors] = useState([]);
  const [specialities, setSpecialities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [speciality, setSpeciality] = useState('');
  const [q, setQ] = useState('');
  const [maxFee, setMaxFee] = useState('');
  const [sort, setSort] = useState('fee');
  const [selected, setSelected] = useState(null);
  const [booking, setBooking] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (speciality) params.speciality = speciality;
      if (q) params.q = q;
      if (maxFee) params.maxFee = maxFee;
      const data = await api.doctors(params);
      let list = data.doctors || [];
      if (sort === 'fee-desc') list = [...list].sort((a, b) => b.doctorProfile.fee - a.doctorProfile.fee);
      if (sort === 'experience') list = [...list].sort((a, b) => b.doctorProfile.experienceYears - a.doctorProfile.experienceYears);
      setDoctors(list);
    } catch (e) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  }, [speciality, q, maxFee, sort, showToast]);

  useEffect(() => {
    api.specialities().then((d) => setSpecialities(d.specialities || [])).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <section aria-labelledby="dir-title">
      <div className="wrap">
        <p className="eyebrow"><span className="num">(01)</span> Directory</p>
        <h1 id="dir-title" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
          Find a doctor <em>by speciality.</em>
        </h1>
        <p className="lede" style={{ marginTop: 14 }}>
          Demo directory — every doctor listed is demo data seeded for trying the app.
        </p>

        <div className="filters" role="search">
          <div className="field grow">
            <label htmlFor="f-q">Search name, clinic or city</label>
            <input id="f-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Sharma, City Care" />
          </div>
          <div className="field">
            <label htmlFor="f-spec">Speciality</label>
            <select id="f-spec" value={speciality} onChange={(e) => setSpeciality(e.target.value)}>
              <option value="">All specialities</option>
              {specialities.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-fee">Max fee (₹)</label>
            <input id="f-fee" type="number" min="0" value={maxFee} onChange={(e) => setMaxFee(e.target.value)} placeholder="Any" />
          </div>
          <div className="field">
            <label htmlFor="f-sort">Sort by</label>
            <select id="f-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="fee">Fee: low to high</option>
              <option value="fee-desc">Fee: high to low</option>
              <option value="experience">Most experienced</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="muted">Loading doctors…</p>
        ) : doctors.length === 0 ? (
          <p className="empty">No doctors match those filters. Try clearing the search or fee limit.</p>
        ) : (
          <div className="doc-list">
            {doctors.map((d, i) => (
              <article className="doc-row" key={d.id} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <span className="idx" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{d.name}</h3>
                  <p className="sub">
                    {d.doctorProfile.speciality} · {d.doctorProfile.qualification} · {d.doctorProfile.experienceYears} yrs experience
                  </p>
                  <p className="sub">{d.doctorProfile.clinic} · {d.doctorProfile.city}</p>
                  <span className="chip">{d.doctorProfile.speciality}</span>
                </div>
                <div className="days">
                  {dayNames(d.doctorProfile.days)}
                  <br />
                  {sessionText(d.doctorProfile.sessions)}
                </div>
                <div className="fee">{inr(d.doctorProfile.fee)}<span>per visit</span></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(d)}>Details</button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      if (!user) { go('auth'); return; }
                      if (user.role !== 'patient') { showToast('Sign in as a patient to book an appointment.'); return; }
                      setBooking(d);
                    }}
                  >
                    Book
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <Dialog title={selected.name} onClose={() => setSelected(null)}>
          <p className="muted" style={{ marginTop: 0 }}>
            {selected.doctorProfile.speciality} · {selected.doctorProfile.qualification} · {selected.doctorProfile.experienceYears} years
          </p>
          <p>{selected.doctorProfile.bio}</p>
          <hr className="rule" />
          <p><strong>Clinic:</strong> {selected.doctorProfile.clinic}, {selected.doctorProfile.city}</p>
          <p><strong>Consultation fee:</strong> {inr(selected.doctorProfile.fee)} per visit</p>
          <p><strong>Consults:</strong> {dayNames(selected.doctorProfile.days)}</p>
          <p><strong>Hours:</strong> {sessionText(selected.doctorProfile.sessions)} ({selected.doctorProfile.slotMinutes}-minute slots)</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSelected(null);
                if (!user) { go('auth'); return; }
                if (user.role !== 'patient') { showToast('Sign in as a patient to book an appointment.'); return; }
                setBooking(selected);
              }}
            >
              Book an appointment
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
          </div>
        </Dialog>
      )}

      {booking && (
        <BookingDialog
          doctor={booking}
          onClose={() => setBooking(null)}
          onBooked={() => { setBooking(null); showToast('Appointment booked. See My appointments for details.'); go('mine'); }}
          showToast={showToast}
        />
      )}
    </section>
  );
}

function BookingDialog({ doctor, onClose, onBooked, showToast }) {
  const [days, setDays] = useState([]);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [waitlistBusy, setWaitlistBusy] = useState(false);

  useEffect(() => {
    api.doctorDays(doctor.id).then((d) => {
      setDays(d.days || []);
      if (d.days?.length) setDate(d.days[0]);
    }).catch((e) => setError(e.message));
  }, [doctor.id]);

  useEffect(() => {
    if (!date) return;
    setTime('');
    api.doctorSlots(doctor.id, date).then((d) => setSlots(d.slots || [])).catch((e) => setError(e.message));
  }, [date, doctor.id]);

  const freeSlots = slots.filter((s) => s.available);

  const book = async () => {
    if (!time) { setError('Pick a time slot first.'); return; }
    setBusy(true);
    setError('');
    try {
      await api.book({ doctorId: doctor.id, date, time, reason });
      onBooked();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const joinWaitlist = async () => {
    setWaitlistBusy(true);
    setError('');
    try {
      await api.joinWaitlist({ doctorId: doctor.id, date, reason });
      showToast(`You are on the waitlist for ${formatDate(date)}. We will notify you if a slot opens up.`);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setWaitlistBusy(false);
    }
  };

  return (
    <Dialog title={`Book with ${doctor.name}`} onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        {doctor.doctorProfile.speciality} · {inr(doctor.doctorProfile.fee)} per visit · {doctor.doctorProfile.slotMinutes}-minute slots
      </p>
      <div className="field">
        <label id="date-label">Pick a day</label>
        <div className="date-chips" role="group" aria-labelledby="date-label">
          {days.slice(0, 10).map((d) => (
            <button key={d} type="button" className={d === date ? 'selected' : ''} onClick={() => setDate(d)} aria-pressed={d === date}>
              {formatDate(d)}
            </button>
          ))}
        </div>
      </div>
      {date && (
        <div className="field">
          <label id="slot-label">Available slots — {formatDate(date)}</label>
          {slots.length === 0 ? (
            <p className="muted">No slots on this day — the doctor does not consult then.</p>
          ) : (
            <div className="slot-grid" role="group" aria-labelledby="slot-label">
              {slots.map((s) => (
                <button
                  key={s.time}
                  type="button"
                  className={`slot ${time === s.time ? 'selected' : ''}`}
                  disabled={!s.available}
                  onClick={() => setTime(s.time)}
                  aria-pressed={time === s.time}
                >
                  {formatTime(s.time)}
                </button>
              ))}
            </div>
          )}
          {slots.length > 0 && freeSlots.length === 0 && (
            <p className="muted">This day is fully booked. Join the waitlist and we will notify you if a slot opens up.</p>
          )}
        </div>
      )}
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="bk-reason">Reason for visit (optional)</label>
        <input id="bk-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fever for 2 days" maxLength={200} />
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
        <button type="button" className="btn btn-primary" disabled={busy || !time} onClick={book}>
          {busy ? 'Booking…' : `Confirm booking — ${inr(doctor.doctorProfile.fee)}`}
        </button>
        {slots.length > 0 && freeSlots.length === 0 && (
          <button type="button" className="btn" disabled={waitlistBusy} onClick={joinWaitlist}>
            {waitlistBusy ? 'Joining…' : 'Join waitlist for this day'}
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
      <p className="muted" style={{ fontSize: '.85rem', marginTop: 14 }}>
        No payment is taken here — the fee is paid at the clinic. This is a demo app.
      </p>
    </Dialog>
  );
}

function MyAppointments({ user, go, showToast }) {
  const [appointments, setAppointments] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [rescheduling, setRescheduling] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, w] = await Promise.all([api.myAppointments(), api.myWaitlist()]);
      setAppointments(a.appointments || []);
      setWaitlist((w.waitlist || []).filter((e) => e.status === 'waiting'));
    } catch (e) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const upcoming = appointments.filter((a) => ['booked', 'confirmed'].includes(a.status) && a.date >= todayIso);
  const past = appointments.filter((a) => !(['booked', 'confirmed'].includes(a.status) && a.date >= todayIso));
  const shown = filter === 'upcoming' ? upcoming : past;

  const cancel = async (id) => {
    try {
      const res = await api.cancelAppointment(id);
      showToast(res.promoted ? 'Cancelled. Your slot went to the next person on the waitlist.' : 'Appointment cancelled.');
      load();
    } catch (e) {
      showToast(e.message);
    }
  };

  if (!user) {
    return (
      <section><div className="wrap">
        <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>My appointments</h1>
        <p className="lede" style={{ marginTop: 14 }}>Sign in to see your appointments.</p>
        <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => go('auth')}>Sign in</button>
      </div></section>
    );
  }

  return (
    <section aria-labelledby="mine-title">
      <div className="wrap">
        <p className="eyebrow"><span className="num">(01)</span> Patient records</p>
        <h1 id="mine-title" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
          My appointments <em>&amp; visits.</em>
        </h1>
        <div className="filters">
          <button type="button" className={`btn btn-sm ${filter === 'upcoming' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setFilter('upcoming')}>
            Upcoming ({upcoming.length})
          </button>
          <button type="button" className={`btn btn-sm ${filter === 'past' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setFilter('past')}>
            Past &amp; cancelled ({past.length})
          </button>
        </div>

        {loading ? (
          <p className="muted">Loading appointments…</p>
        ) : shown.length === 0 ? (
          <p className="empty">
            {filter === 'upcoming'
              ? 'No upcoming appointments. Book one from the doctor directory.'
              : 'No past visits yet.'}
          </p>
        ) : (
          shown.map((a) => (
            <article className="appt-row" key={a.id}>
              <div className="when">
                {formatTime(a.time)}
                <span>{formatDate(a.date)}</span>
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem' }}>
                  {a.doctor?.name || 'Doctor'} <span className="muted" style={{ fontWeight: 400 }}>· {a.doctor?.doctorProfile?.speciality}</span>
                </h3>
                <p className="muted" style={{ margin: '4px 0' }}>
                  {a.doctor?.doctorProfile?.clinic} · {inr(a.fee)} per visit
                  {a.fromWaitlist ? ' · booked from waitlist' : ''}
                </p>
                {a.reason && <p style={{ margin: '4px 0' }}>Reason: {a.reason}</p>}
                <p><span className={`status ${a.status}`}>{a.status}</span></p>
                {a.status === 'completed' && (a.visitNotes || a.prescription?.length > 0) && (
                  <div className="notes">
                    {a.visitNotes && <p style={{ margin: 0 }}>{a.visitNotes}</p>}
                    {a.prescription?.length > 0 && (
                      <>
                        <strong>Prescription</strong>
                        <ul className="rx">
                          {a.prescription.map((p, i) => (
                            <li key={i}>{p.medicine} — {p.dosage}{p.duration ? ` · ${p.duration}` : ''}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="appt-actions">
                {['booked', 'confirmed'].includes(a.status) && (
                  <>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRescheduling(a)}>Reschedule</button>
                    <button type="button" className="btn btn-sm" onClick={() => cancel(a.id)}>Cancel</button>
                  </>
                )}
                {a.status === 'completed' && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDetail(a)}>View record</button>
                )}
              </div>
            </article>
          ))
        )}

        {waitlist.length > 0 && (
          <>
            <h2 style={{ fontSize: '1.5rem', marginTop: 48 }}>My waitlist</h2>
            {waitlist.map((w) => (
              <div className="appt-row" key={w.id}>
                <div className="when">{formatDate(w.date)}<span>waiting</span></div>
                <div>
                  <h3 style={{ fontSize: '1.2rem' }}>{w.doctor?.name}</h3>
                  <p className="muted" style={{ margin: '4px 0' }}>{w.doctor?.doctorProfile?.speciality} · joined {new Date(w.createdAt).toLocaleDateString('en-IN')}</p>
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

      {rescheduling && (
        <RescheduleDialog
          appt={rescheduling}
          onClose={() => setRescheduling(null)}
          onDone={() => { setRescheduling(null); showToast('Appointment rescheduled.'); load(); }}
          showToast={showToast}
        />
      )}
      {detail && (
        <Dialog title={`Visit record — ${formatDate(detail.date)}`} onClose={() => setDetail(null)}>
          <p><strong>Doctor:</strong> {detail.doctor?.name} · {detail.doctor?.doctorProfile?.speciality}</p>
          <p><strong>Time:</strong> {formatTime(detail.time)}</p>
          {detail.visitNotes && <div className="notes"><p style={{ margin: 0 }}>{detail.visitNotes}</p></div>}
          {detail.prescription?.length > 0 && (
            <>
              <strong>Prescription</strong>
              <ul className="rx">
                {detail.prescription.map((p, i) => (
                  <li key={i}>{p.medicine} — {p.dosage}{p.duration ? ` · ${p.duration}` : ''}</li>
                ))}
              </ul>
            </>
          )}
        </Dialog>
      )}
    </section>
  );
}

function RescheduleDialog({ appt, onClose, onDone, showToast }) {
  const doctorId = appt.doctor?.id || appt.doctor?._id;
  const [days, setDays] = useState([]);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.doctorDays(doctorId).then((d) => {
      setDays(d.days || []);
      if (d.days?.length) setDate(d.days[0]);
    }).catch((e) => setError(e.message));
  }, [doctorId]);

  useEffect(() => {
    if (!date) return;
    setTime('');
    api.doctorSlots(doctorId, date).then((d) => setSlots(d.slots || [])).catch((e) => setError(e.message));
  }, [date, doctorId]);

  const submit = async () => {
    if (!time) { setError('Pick a time slot first.'); return; }
    setBusy(true);
    try {
      await api.reschedule(appt.id, { date, time });
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Reschedule — ${appt.doctor?.name || 'Doctor'}`} onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Currently {formatDate(appt.date)} at {formatTime(appt.time)}. Your old slot goes to the waitlist.
      </p>
      <div className="date-chips">
        {days.slice(0, 10).map((d) => (
          <button key={d} type="button" className={d === date ? 'selected' : ''} onClick={() => setDate(d)} aria-pressed={d === date}>
            {formatDate(d)}
          </button>
        ))}
      </div>
      <div className="slot-grid">
        {slots.map((s) => (
          <button key={s.time} type="button" className={`slot ${time === s.time ? 'selected' : ''}`} disabled={!s.available} onClick={() => setTime(s.time)}>
            {formatTime(s.time)}
          </button>
        ))}
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button type="button" className="btn btn-primary" disabled={busy || !time} onClick={submit}>
          {busy ? 'Moving…' : 'Confirm new slot'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Dialog>
  );
}

function DoctorDashboard({ user, showToast }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [day, setDay] = useState(null);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, w] = await Promise.all([api.doctorDay(date), api.doctorWaitlist()]);
      setDay(d);
      setWaitlist(w.waitlist || []);
    } catch (e) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  }, [date, showToast]);

  useEffect(() => { load(); }, [load]);

  const act = async (fn, msg) => {
    try {
      await fn();
      showToast(msg);
      load();
    } catch (e) {
      showToast(e.message);
    }
  };

  if (!user || user.role !== 'doctor') {
    return (
      <section><div className="wrap">
        <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>Doctor dashboard</h1>
        <p className="lede" style={{ marginTop: 14 }}>Sign in with a doctor account to open this dashboard.</p>
      </div></section>
    );
  }

  const appts = day?.appointments || [];
  const active = appts.filter((a) => ['booked', 'confirmed'].includes(a.status));

  return (
    <section aria-labelledby="dash-title">
      <div className="wrap">
        <p className="eyebrow"><span className="num">(01)</span> Doctor dashboard</p>
        <h1 id="dash-title" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
          {user.name}’s <em>day.</em>
        </h1>
        <p className="lede" style={{ marginTop: 14 }}>
          {user.doctorProfile?.speciality} · {user.doctorProfile?.clinic} · {inr(user.doctorProfile?.fee)} per visit
        </p>
        <div className="filters">
          <div className="field">
            <label htmlFor="dash-date">Day</label>
            <input id="dash-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Summary</label>
            <p style={{ margin: 0, paddingTop: 12 }}>
              {active.length} active · {appts.filter((a) => a.status === 'completed').length} completed · {day?.slots?.length || 0} slots in schedule
            </p>
          </div>
        </div>

        {loading ? (
          <p className="muted">Loading your day…</p>
        ) : appts.length === 0 ? (
          <p className="empty">No appointments on {formatDate(date)}. Your generated slots are still bookable by patients.</p>
        ) : (
          appts.map((a) => (
            <article className="appt-row" key={a.id}>
              <div className="when">
                {formatTime(a.time)}
                <span>{formatDate(a.date)}</span>
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem' }}>{a.patient?.name}</h3>
                <p className="muted" style={{ margin: '4px 0' }}>
                  {a.patient?.email}{a.patient?.phone ? ` · ${a.patient.phone}` : ''}
                </p>
                {a.reason && <p style={{ margin: '4px 0' }}>Reason: {a.reason}</p>}
                <p><span className={`status ${a.status}`}>{a.status}</span>{a.fromWaitlist ? ' · from waitlist' : ''}</p>
              </div>
              <div className="appt-actions">
                {a.status === 'booked' && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => act(() => api.confirmAppointment(a.id), 'Appointment confirmed.')}>
                    Confirm
                  </button>
                )}
                {['booked', 'confirmed'].includes(a.status) && (
                  <>
                    <button type="button" className="btn btn-sm" onClick={() => setCompleting(a)}>Complete visit</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => act(() => api.noShow(a.id), 'Marked as no-show.')}>No-show</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => act(() => api.cancelAppointment(a.id), 'Appointment cancelled.')}>Cancel</button>
                  </>
                )}
              </div>
            </article>
          ))
        )}

        <h2 style={{ fontSize: '1.5rem', marginTop: 48 }}>Waitlist for you</h2>
        {waitlist.length === 0 ? (
          <p className="empty">Nobody is waiting for a slot with you right now.</p>
        ) : (
          waitlist.map((w) => (
            <div className="appt-row" key={w.id}>
              <div className="when">{formatDate(w.date)}<span>waiting</span></div>
              <div>
                <h3 style={{ fontSize: '1.2rem' }}>{w.patient?.name}</h3>
                <p className="muted" style={{ margin: '4px 0' }}>{w.reason || 'No reason given'} · waiting since {new Date(w.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="appt-actions">
                <span className="muted" style={{ fontSize: '.9rem' }}>Auto-promoted on the next cancellation</span>
              </div>
            </div>
          ))
        )}
      </div>

      {completing && (
        <CompleteDialog
          appt={completing}
          onClose={() => setCompleting(null)}
          onDone={() => { setCompleting(null); showToast('Visit completed — notes and prescription saved.'); load(); }}
          showToast={showToast}
        />
      )}
    </section>
  );
}

function CompleteDialog({ appt, onClose, onDone, showToast }) {
  const [notes, setNotes] = useState('');
  const [rx, setRx] = useState([{ medicine: '', dosage: '', duration: '' }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const prescription = rx.filter((r) => r.medicine.trim()).map((r) => ({
        medicine: r.medicine.trim(),
        dosage: r.dosage.trim(),
        duration: r.duration.trim(),
      }));
      await api.completeAppointment(appt.id, { visitNotes: notes.trim(), prescription });
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Complete visit — ${appt.patient?.name}`} onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>{formatDate(appt.date)} at {formatTime(appt.time)}</p>
      <div className="form-stack">
        <div className="field">
          <label htmlFor="visit-notes">Visit notes</label>
          <textarea id="visit-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Diagnosis, advice, follow-up…" />
        </div>
        <div>
          <span className="field"><label>Prescription (optional)</label></span>
          {rx.map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginTop: 8 }}>
              <input aria-label="Medicine" placeholder="Medicine" value={row.medicine} onChange={(e) => setRx(rx.map((r, j) => (j === i ? { ...r, medicine: e.target.value } : r)))} />
              <input aria-label="Dosage" placeholder="Dosage" value={row.dosage} onChange={(e) => setRx(rx.map((r, j) => (j === i ? { ...r, dosage: e.target.value } : r)))} />
              <input aria-label="Duration" placeholder="Duration" value={row.duration} onChange={(e) => setRx(rx.map((r, j) => (j === i ? { ...r, duration: e.target.value } : r)))} />
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setRx([...rx, { medicine: '', dosage: '', duration: '' }])}>
            + Add medicine
          </button>
        </div>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>
          {busy ? 'Saving…' : 'Save visit record'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Dialog>
  );
}

function AdminView({ showToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminOverview().then(setData).catch((e) => showToast(e.message)).finally(() => setLoading(false));
  }, [showToast]);

  if (loading) {
    return <section><div className="wrap"><p className="muted">Loading analytics…</p></div></section>;
  }
  if (!data) {
    return <section><div className="wrap"><p className="alert">Analytics could not be loaded.</p></div></section>;
  }

  const maxSpec = Math.max(1, ...Object.values(data.bySpeciality));
  const maxTrend = Math.max(1, ...data.trend.map((t) => t.count));

  return (
    <section aria-labelledby="admin-title">
      <div className="wrap">
        <p className="eyebrow"><span className="num">(01)</span> Admin analytics</p>
        <h1 id="admin-title" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
          The clinic, <em>in numbers.</em>
        </h1>
        <p className="lede" style={{ marginTop: 14 }}>
          Computed live from real appointments in the database — including the seeded demo visits.
        </p>

        <div className="stats-strip">
          <div className="stat"><b>{data.totals.doctors}</b><span>doctors</span></div>
          <div className="stat"><b>{data.totals.patients}</b><span>patients</span></div>
          <div className="stat"><b>{data.totals.appointments}</b><span>appointments</span></div>
          <div className="stat"><b>{inr(data.totals.revenue)}</b><span>fees on active bookings</span></div>
        </div>

        <h2 style={{ fontSize: '1.5rem' }}>Bookings by speciality</h2>
        <div className="bar-chart">
          {Object.entries(data.bySpeciality).sort((a, b) => b[1] - a[1]).map(([spec, count]) => (
            <div className="bar-row" key={spec}>
              <span>{spec}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(count / maxSpec) * 100}%` }} /></div>
              <strong>{count}</strong>
            </div>
          ))}
          {Object.keys(data.bySpeciality).length === 0 && <p className="muted">No active bookings yet.</p>}
        </div>

        <h2 style={{ fontSize: '1.5rem', marginTop: 48 }}>Doctor utilisation — next 7 days</h2>
        <p className="muted">Active bookings against slots the schedule generates.</p>
        <table className="util-table">
          <thead><tr><th>Doctor</th><th>Speciality</th><th>Booked</th><th>Slots</th><th>Utilisation</th></tr></thead>
          <tbody>
            {data.utilisation.map((u) => (
              <tr key={u.doctor}>
                <td>{u.doctor}</td><td>{u.speciality}</td><td>{u.booked}</td><td>{u.slots}</td><td><strong>{u.rate}%</strong></td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 style={{ fontSize: '1.5rem', marginTop: 48 }}>Bookings per day</h2>
        <div className="bar-chart">
          {data.trend.map((t) => (
            <div className="bar-row" key={t.date}>
              <span>{formatDate(t.date)}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(t.count / maxTrend) * 100}%` }} /></div>
              <strong>{t.count}</strong>
            </div>
          ))}
          {data.trend.length === 0 && <p className="muted">No bookings recorded yet.</p>}
        </div>

        <h2 style={{ fontSize: '1.5rem', marginTop: 48 }}>By status</h2>
        <p>
          {Object.entries(data.byStatus).map(([s, c]) => `${s}: ${c}`).join(' · ') || 'No appointments yet.'}
        </p>
      </div>
    </section>
  );
}

function AuthView({ onSignedIn, showToast }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [speciality, setSpeciality] = useState('');
  const [fee, setFee] = useState('');
  const [clinic, setClinic] = useState('');
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
        const payload = { name, email, password, role };
        if (role === 'doctor') {
          payload.doctorProfile = {
            speciality,
            fee: Number(fee) || 0,
            clinic,
            days: [1, 2, 3, 4, 5],
            sessions: [{ start: '09:00', end: '13:00' }],
            slotMinutes: 30,
          };
        }
        data = await api.register(payload);
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
                <>
                  <div className="field">
                    <label htmlFor="au-role">I am a…</label>
                    <select id="au-role" value={role} onChange={(e) => setRole(e.target.value)}>
                      <option value="patient">Patient</option>
                      <option value="doctor">Doctor</option>
                    </select>
                  </div>
                  {role === 'doctor' && (
                    <>
                      <div className="field">
                        <label htmlFor="au-spec">Speciality</label>
                        <input id="au-spec" value={speciality} onChange={(e) => setSpeciality(e.target.value)} required placeholder="e.g. Cardiology" />
                      </div>
                      <div className="field">
                        <label htmlFor="au-fee">Consultation fee (₹)</label>
                        <input id="au-fee" type="number" min="0" value={fee} onChange={(e) => setFee(e.target.value)} required />
                      </div>
                      <div className="field">
                        <label htmlFor="au-clinic">Clinic name</label>
                        <input id="au-clinic" value={clinic} onChange={(e) => setClinic(e.target.value)} placeholder="e.g. City Care Clinic" />
                      </div>
                    </>
                  )}
                </>
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
            <p className="eyebrow" style={{ color: '#93b4ff' }}><span className="num">(02)</span> Try it instantly</p>
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
              Admin accounts are created by the clinic, not by sign-up. Use the demo admin above to see analytics.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
