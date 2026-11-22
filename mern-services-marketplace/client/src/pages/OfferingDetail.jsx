import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, formatINR, formatDate } from '../api';
import { AREAS } from '../data/content';
import Dialog from '../components/Dialog';
import MatchScoreBar from '../components/MatchScoreBar';

// Client-side preview of the same formula the server applies at booking:
// peak surcharge 15% (slots 17:00–20:00 or weekends), platform fee 5%,
// GST 18%. The server recomputes and returns the authoritative breakdown.
function previewPrice(base, dateStr, slot) {
  if (!dateStr || !slot) return null;
  const hour = Number(slot.slice(0, 2));
  const day = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  const peak = hour >= 17 || day === 0 || day === 6;
  const peakSurcharge = peak ? Math.round(base * 0.15) : 0;
  const platformFee = Math.round((base + peakSurcharge) * 0.05);
  const gst = Math.round((base + peakSurcharge + platformFee) * 0.18);
  return {
    base,
    peakSurcharge,
    platformFee,
    gst,
    total: base + peakSurcharge + platformFee + gst,
    peak,
  };
}

function next7Days() {
  const days = [];
  const now = new Date();
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

const DAYS = next7Days();

export default function OfferingDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [offering, setOffering] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [date, setDate] = useState(DAYS[0]);
  const [slot, setSlot] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [slotsList, setSlotsList] = useState([]);
  const [address, setAddress] = useState('');
  const [area, setArea] = useState(user?.city || 'Azamgarh');
  const [notes, setNotes] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .getOffering(id)
      .then((d) => alive && setOffering(d.offering))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    api
      .offeringReviews(id)
      .then((d) => alive && setReviews(d.reviews))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!dialogOpen || !offering) return;
    setSlot('');
    api
      .slots(offering._id, date)
      .then((d) => {
        setBookedSlots(d.booked);
        setSlotsList(d.slots);
      })
      .catch((err) => setBookingError(err.message));
  }, [dialogOpen, date, offering]);

  const preview = useMemo(
    () => (offering ? previewPrice(offering.price, date, slot) : null),
    [offering, date, slot]
  );

  async function book(e) {
    e.preventDefault();
    setBookingError('');
    if (!user) {
      navigate('/login');
      return;
    }
    if (!slot) {
      setBookingError('Please choose a time slot.');
      return;
    }
    if (!address.trim()) {
      setBookingError('Please enter the service address.');
      return;
    }
    setBookingBusy(true);
    try {
      const data = await api.createBooking({
        offeringId: offering._id,
        date,
        slot,
        address,
        area,
        notes,
      });
      setConfirmed(data.booking);
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBookingBusy(false);
    }
  }

  if (loading) return <main className="page"><p className="muted" role="status">Loading…</p></main>;
  if (error || !offering) {
    return (
      <main className="page">
        <p className="form-error" role="alert">{error || 'Offering not found'}</p>
        <Link className="btn btn-ghost" to="/browse">Back to browse</Link>
      </main>
    );
  }

  const provider = offering.provider || {};
  const service = offering.service || {};

  return (
    <main className="page">
      <p className="section-label">{service.category}</p>
      <div className="detail-split">
        <div className="detail-main">
          <h1 className="page-title" aria-label={`${service.name} by ${provider.name}`}>
            {service.name} <em>by {provider.name}</em>
          </h1>
          <p className="page-sub">{service.description}</p>
          <dl className="detail-facts">
            <div><dt>Price</dt><dd>{formatINR(offering.price)}</dd></div>
            <div><dt>Duration</dt><dd>{offering.durationMin} minutes</dd></div>
            <div><dt>Base price</dt><dd>{formatINR(service.basePrice)} (category guide)</dd></div>
            <div><dt>Areas served</dt><dd>{offering.areas.join(', ')}</dd></div>
          </dl>
          {offering.bio && <p className="detail-bio">“{offering.bio}”</p>}
          <div className="detail-provider">
            <span className="avatar" style={{ backgroundColor: provider.avatarColor }} aria-hidden="true">
              {provider.name?.charAt(0)}
            </span>
            <div>
              <strong>{provider.name}</strong>
              <span className="muted">
                {provider.city} · {provider.yearsExperience} yrs experience ·{' '}
                {offering.providerStats?.completedJobs} jobs done · responds to{' '}
                {Math.round((offering.providerStats?.responseRate || 0) * 100)}% of requests
              </span>
            </div>
            <Link className="btn btn-ghost btn-small" to={`/providers/${provider._id}`}>
              Full profile
            </Link>
          </div>

          <section aria-labelledby="reviews-heading" className="reviews-section">
            <h2 id="reviews-heading" className="section-title-small">
              Reviews ({reviews.length})
            </h2>
            {reviews.length === 0 && (
              <p className="muted">No reviews yet for this offering.</p>
            )}
            <ul className="review-list">
              {reviews.map((r) => (
                <li key={r._id} className="review-row">
                  <span className="avatar avatar--small" style={{ backgroundColor: r.customer?.avatarColor }} aria-hidden="true">
                    {r.customer?.name?.charAt(0)}
                  </span>
                  <div>
                    <strong>{r.customer?.name}</strong>
                    <span className="review-stars" aria-label={`${r.rating} out of 5 stars`}>
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </span>
                    {r.comment && <p>{r.comment}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="detail-side tape tape--sage">
          <MatchScoreBar score={offering.matchScore} parts={offering.matchParts} />
          <p className="muted match-note">
            Rating {offering.providerStats?.rating} · {offering.providerStats?.reviewCount} reviews ·
            price {offering.price < (service.basePrice || offering.price) ? 'below' : 'near'} the category
            guide price.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => {
              setConfirmed(null);
              setBookingError('');
              setDialogOpen(true);
            }}
          >
            Book this service
          </button>
          <p className="muted small">
            Fixed hourly slots, 08:00–20:00, for the next 7 days. The price is confirmed by the
            server before the booking is saved.
          </p>
        </aside>
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={`Book ${service.name}`}>
        {confirmed ? (
          <div className="booking-confirm" role="status">
            <p className="section-label">(✓) Booking requested</p>
            <h3>Request sent to {provider.name}</h3>
            <p>
              {formatDate(confirmed.date)} at {confirmed.slot} · {confirmed.area}
            </p>
            <dl className="price-breakdown">
              <div><dt>Base price</dt><dd>{formatINR(confirmed.priceBreakdown.base)}</dd></div>
              <div><dt>Peak surcharge</dt><dd>{formatINR(confirmed.priceBreakdown.peakSurcharge)}</dd></div>
              <div><dt>Platform fee (5%)</dt><dd>{formatINR(confirmed.priceBreakdown.platformFee)}</dd></div>
              <div><dt>GST (18%)</dt><dd>{formatINR(confirmed.priceBreakdown.gst)}</dd></div>
              <div className="price-total"><dt>Total</dt><dd>{formatINR(confirmed.priceBreakdown.total)}</dd></div>
            </dl>
            <p className="muted small">
              Prices confirmed by the server. No payment is taken in this demo.
            </p>
            <div className="dialog-actions">
              <Link className="btn btn-primary" to="/bookings">Track my booking</Link>
              <button type="button" className="btn btn-ghost" onClick={() => setDialogOpen(false)}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form className="form" onSubmit={book} noValidate>
            <label className="field">
              <span>Date (next 7 days)</span>
              <select value={date} onChange={(e) => setDate(e.target.value)}>
                {DAYS.map((d) => (
                  <option key={d} value={d}>{formatDate(d)}</option>
                ))}
              </select>
            </label>

            <fieldset className="slot-fieldset">
              <legend>Time slot</legend>
              <div className="slot-grid" role="group" aria-label="Available time slots">
                {slotsList.map((s) => {
                  const taken = bookedSlots.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`slot-btn ${slot === s ? 'slot-btn--active' : ''}`}
                      disabled={taken}
                      aria-pressed={slot === s}
                      onClick={() => setSlot(s)}
                    >
                      {s}
                      {taken ? ' · booked' : ''}
                    </button>
                  );
                })}
              </div>
              <p className="muted small">Slots 17:00–19:00 and weekends carry a 15% peak surcharge.</p>
            </fieldset>

            <label className="field">
              <span>Area</span>
              <select value={area} onChange={(e) => setArea(e.target.value)}>
                {AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Service address</span>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House no., street, area"
                required
              />
            </label>
            <label className="field">
              <span>Notes for the provider (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Gate code, parking, anything useful"
              />
            </label>

            {preview && slot && (
              <dl className="price-breakdown" aria-live="polite">
                <div><dt>Base price</dt><dd>{formatINR(preview.base)}</dd></div>
                <div>
                  <dt>Peak surcharge {preview.peak ? '(15% — peak slot)' : '(none)'}</dt>
                  <dd>{formatINR(preview.peakSurcharge)}</dd>
                </div>
                <div><dt>Platform fee (5%)</dt><dd>{formatINR(preview.platformFee)}</dd></div>
                <div><dt>GST (18%)</dt><dd>{formatINR(preview.gst)}</dd></div>
                <div className="price-total"><dt>Estimated total</dt><dd>{formatINR(preview.total)}</dd></div>
                <p className="muted small">Estimate — the server confirms the final price when you book.</p>
              </dl>
            )}

            {bookingError && <p className="form-error" role="alert">{bookingError}</p>}
            <div className="dialog-actions">
              <button type="submit" className="btn btn-primary" disabled={bookingBusy}>
                {bookingBusy ? 'Booking…' : user ? 'Confirm booking' : 'Sign in to book'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </main>
  );
}
