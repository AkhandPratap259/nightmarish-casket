import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatINR, formatDate } from '../api';
import { STATUS_LABELS, STATUS_STEPS } from '../data/content';
import Dialog from '../components/Dialog';
import { getSocket } from '../socket';

const FILTERS = [
  { value: '', label: 'All bookings' },
  { value: 'requested', label: 'Requested' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

export default function MyBookings({ user }) {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [reviewFor, setReviewFor] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .myBookings(filter || undefined)
      .then((d) => setBookings(d.bookings))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates: the server emits booking:updated to both parties' rooms.
  useEffect(() => {
    if (!user) return undefined;
    const socket = getSocket(user.id);
    const onUpdate = ({ booking }) => {
      setBookings((prev) => {
        const exists = prev.some((b) => b._id === booking._id);
        if (!exists) return prev;
        return prev.map((b) => (b._id === booking._id ? booking : b));
      });
      setNotice(`Booking ${booking.serviceName} is now ${STATUS_LABELS[booking.status] || booking.status}.`);
    };
    socket.on('booking:updated', onUpdate);
    return () => {
      socket.off('booking:updated', onUpdate);
    };
  }, [user]);

  async function changeStatus(booking, status) {
    setError('');
    try {
      const data = await api.updateBookingStatus(booking._id, status);
      setBookings((prev) => prev.map((b) => (b._id === booking._id ? data.booking : b)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    setReviewError('');
    setReviewBusy(true);
    try {
      await api.createReview({ bookingId: reviewFor._id, rating, comment });
      setReviewFor(null);
      setComment('');
      setRating(5);
      setNotice('Thanks — your review was saved and the provider rating updated.');
      load();
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setReviewBusy(false);
    }
  }

  if (!user) {
    return (
      <main className="page">
        <h1 className="page-title">My bookings</h1>
        <p>Please <Link to="/login">sign in</Link> to see your bookings.</p>
      </main>
    );
  }

  const isCustomer = user.role === 'customer';

  return (
    <main className="page">
      <p className="section-label">(01) {isCustomer ? 'Your bookings' : 'Your jobs'}</p>
      <h1 className="page-title">
        {isCustomer ? (
          <>Track every <em>booking</em></>
        ) : (
          <>Track every <em>job</em></>
        )}
      </h1>
      {notice && (
        <p className="live-notice" role="status" aria-live="polite">{notice}</p>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="filter-chips" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`chip ${filter === f.value ? 'chip--active' : ''}`}
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p className="muted" role="status">Loading bookings…</p>}

      <ul className="booking-list">
        {bookings.map((b) => {
          const stepIndex = STATUS_STEPS.indexOf(b.status);
          const terminal = ['declined', 'cancelled_by_customer', 'cancelled_by_provider'].includes(b.status);
          return (
            <li key={b._id} className="booking-row">
              <div className="booking-head">
                <div>
                  <strong>{b.serviceName}</strong>
                  <span className="muted">
                    {isCustomer ? b.provider?.name : b.customer?.name} · {formatDate(b.date)} at {b.slot} · {b.area}
                  </span>
                </div>
                <span className={`status-pill status-pill--${b.status}`}>
                  {STATUS_LABELS[b.status] || b.status}
                </span>
              </div>

              <ol className="timeline" aria-label="Booking progress">
                {STATUS_STEPS.map((step, i) => (
                  <li
                    key={step}
                    className={`timeline-step ${terminal ? 'timeline-step--terminal' : ''} ${i <= stepIndex && !terminal ? 'timeline-step--done' : ''}`}
                    aria-current={i === stepIndex && !terminal ? 'step' : undefined}
                  >
                    <span className="timeline-dot" aria-hidden="true" />
                    <span>{STATUS_LABELS[step]}</span>
                  </li>
                ))}
              </ol>

              <p className="booking-price">
                Total {formatINR(b.priceBreakdown?.total)} · {b.address}
                {b.notes ? ` · “${b.notes}”` : ''}
              </p>

              <div className="booking-actions">
                {isCustomer && (b.status === 'requested' || b.status === 'accepted') && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => changeStatus(b, 'cancelled_by_customer')}
                  >
                    Cancel booking
                  </button>
                )}
                {!isCustomer && b.status === 'requested' && (
                  <>
                    <button type="button" className="btn btn-primary btn-small" onClick={() => changeStatus(b, 'accepted')}>
                      Accept
                    </button>
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => changeStatus(b, 'declined')}>
                      Decline
                    </button>
                  </>
                )}
                {!isCustomer && b.status === 'accepted' && (
                  <>
                    <button type="button" className="btn btn-primary btn-small" onClick={() => changeStatus(b, 'in_progress')}>
                      Start job
                    </button>
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => changeStatus(b, 'cancelled_by_provider')}>
                      Cancel job
                    </button>
                  </>
                )}
                {!isCustomer && b.status === 'in_progress' && (
                  <button type="button" className="btn btn-primary btn-small" onClick={() => changeStatus(b, 'completed')}>
                    Mark completed
                  </button>
                )}
                {isCustomer && b.status === 'completed' && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => {
                      setReviewFor(b);
                      setRating(5);
                      setComment('');
                      setReviewError('');
                    }}
                  >
                    Write a review
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {!loading && bookings.length === 0 && (
        <p className="empty-state">
          No bookings here yet. <Link to="/browse">Browse services</Link> to book your first one.
        </p>
      )}

      <Dialog open={!!reviewFor} onClose={() => setReviewFor(null)} title="Review this job">
        {reviewFor && (
          <form className="form" onSubmit={submitReview} noValidate>
            <p className="muted">
              {reviewFor.serviceName} with {reviewFor.provider?.name} on {formatDate(reviewFor.date)}.
              One review per booking — it updates the provider&apos;s public rating.
            </p>
            <fieldset className="rating-fieldset">
              <legend>Rating</legend>
              <div className="rating-row" role="group" aria-label="Star rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`star-btn ${rating >= n ? 'star-btn--on' : ''}`}
                    aria-label={`${n} star${n === 1 ? '' : 's'}`}
                    aria-pressed={rating === n}
                    onClick={() => setRating(n)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="field">
              <span>Comment (optional)</span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="How was the work?"
              />
            </label>
            {reviewError && <p className="form-error" role="alert">{reviewError}</p>}
            <div className="dialog-actions">
              <button type="submit" className="btn btn-primary" disabled={reviewBusy}>
                {reviewBusy ? 'Saving…' : 'Submit review'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setReviewFor(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </main>
  );
}
