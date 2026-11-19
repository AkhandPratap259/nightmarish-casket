import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, formatINR } from '../api';

export default function ProviderProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .getProvider(id)
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    api
      .providerReviews(id)
      .then((d) => alive && setReviews(d.reviews))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) return <main className="page"><p className="muted" role="status">Loading…</p></main>;
  if (error || !data) {
    return (
      <main className="page">
        <p className="form-error" role="alert">{error || 'Provider not found'}</p>
        <Link className="btn btn-ghost" to="/">Back home</Link>
      </main>
    );
  }

  const { provider, offerings } = data;
  const stats = provider.stats || {};

  return (
    <main className="page">
      <p className="section-label">(01) Provider profile</p>
      <div className="detail-split">
        <div className="detail-main">
          <div className="profile-head">
            <span className="avatar avatar--large" style={{ backgroundColor: provider.avatarColor }} aria-hidden="true">
              {provider.name.charAt(0)}
            </span>
            <div>
              <h1 className="page-title">{provider.name}</h1>
              <p className="muted">
                {provider.city} · {provider.yearsExperience} years experience
              </p>
            </div>
          </div>
          {provider.bio && <p className="detail-bio">“{provider.bio}”</p>}
          <dl className="detail-facts">
            <div><dt>Rating</dt><dd>★ {stats.rating} ({stats.reviewCount} reviews)</dd></div>
            <div><dt>Jobs completed</dt><dd>{stats.completedJobs}</dd></div>
            <div><dt>Response rate</dt><dd>{Math.round((stats.responseRate || 0) * 100)}%</dd></div>
            <div><dt>Phone</dt><dd>{provider.phone || 'Not listed'}</dd></div>
          </dl>

          <h2 className="section-title-small">Services offered ({offerings.length})</h2>
          <ul className="offering-list">
            {offerings.map((o) => (
              <li key={o._id} className="offering-row">
                <Link className="offering-main" to={`/offerings/${o._id}`}>
                  <span className="offering-body">
                    <span className="offering-category">{o.service?.category}</span>
                    <strong className="offering-name">{o.service?.name}</strong>
                    <span className="muted">
                      {formatINR(o.price)} · {o.durationMin} min · Serves {o.areas.join(', ')}
                    </span>
                  </span>
                </Link>
                <Link className="btn btn-primary btn-small" to={`/offerings/${o._id}`}>Book</Link>
              </li>
            ))}
          </ul>

          <h2 className="section-title-small">Reviews ({reviews.length})</h2>
          {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
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
        </div>
        <aside className="detail-side">
          <div className="profile-score-card">
            <p className="section-label">Why book this provider</p>
            <p>
              Rated <strong>★ {stats.rating}</strong> across {stats.reviewCount} reviews, with{' '}
              {stats.completedJobs} jobs completed and a {Math.round((stats.responseRate || 0) * 100)}%
              response rate. Each offering shows its own full match-score breakdown.
            </p>
            <Link className="btn btn-primary btn-block" to="/browse">Browse all services</Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
