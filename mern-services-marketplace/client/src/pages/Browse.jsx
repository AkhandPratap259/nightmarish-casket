import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatINR } from '../api';
import { AREAS, CATEGORIES, MATCH_FORMULA, SERVICE_ICONS } from '../data/content';
import Reveal from '../components/Reveal';
import MatchScoreBar from '../components/MatchScoreBar';

export default function Browse({ user }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [offerings, setOfferings] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const category = searchParams.get('category') || '';
  const area = searchParams.get('area') || '';
  const q = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'match';

  useEffect(() => {
    api.listServices().then((d) => setServices(d.services)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = {};
    if (category) params.category = category;
    if (area) params.area = area;
    if (q) params.q = q;
    if (sort) params.sort = sort;
    api
      .listOfferings(params)
      .then((d) => setOfferings(d.offerings))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [category, area, q, sort]);

  function update(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  const serviceNames = [...new Set(offerings.map((o) => o.service?.name).filter(Boolean))];

  return (
    <main className="page">
      <p className="section-label">(01) Browse services</p>
      <h1 className="page-title">
        Ranked by <em>match,</em> not by who paid.
      </h1>
      <p className="page-sub">
        Every card shows its match score and why it earned it. Filter by category or area, or
        sort by price — the score breakdown stays visible either way.
      </p>

      <form className="filters" onSubmit={(e) => e.preventDefault()} aria-label="Filter offerings">
        <label className="field field-inline">
          <span>Search</span>
          <input
            type="search"
            value={q}
            placeholder="Service or provider name"
            onChange={(e) => update('q', e.target.value)}
          />
        </label>
        <label className="field field-inline">
          <span>Category</span>
          <select value={category} onChange={(e) => update('category', e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field field-inline">
          <span>Your area</span>
          <select value={area} onChange={(e) => update('area', e.target.value)}>
            <option value="">All areas</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="field field-inline">
          <span>Sort by</span>
          <select value={sort} onChange={(e) => update('sort', e.target.value)}>
            <option value="match">Best match</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>
      </form>

      {loading && <p className="muted" role="status">Loading offerings…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !error && (
        <p className="result-count" role="status">
          {offerings.length} offering{offerings.length === 1 ? '' : 's'}
          {serviceNames.length > 0 ? ` · ${serviceNames.length} services` : ''}
        </p>
      )}

      <ul className="offering-list">
        {offerings.map((o, i) => (
          <Reveal key={o._id} delay={Math.min(i, 5) * 40}>
            <li className="offering-row tilt">
              <Link className="offering-main" to={`/offerings/${o._id}`}>
                <span className="offering-icon" aria-hidden="true">
                  {SERVICE_ICONS[o.service?.icon] || '⚒'}
                </span>
                <span className="offering-body">
                  <span className="offering-category">{o.service?.category}</span>
                  <strong className="offering-name">{o.service?.name}</strong>
                  <span className="offering-provider">
                    {o.provider?.name} · {o.provider?.city} · {o.provider?.yearsExperience} yrs
                    experience · ★ {o.providerStats?.rating} ({o.providerStats?.reviewCount} reviews)
                  </span>
                  <span className="offering-areas">
                    Serves: {o.areas.join(', ')}
                  </span>
                  <span className="offering-meta">
                    {formatINR(o.price)} · {o.durationMin} min · {o.providerStats?.completedJobs} jobs done
                  </span>
                </span>
              </Link>
              <span className="offering-score">
                <MatchScoreBar score={o.matchScore} parts={o.matchParts} compact />
                <Link className="btn btn-primary btn-small" to={`/offerings/${o._id}`}>
                  Book now
                </Link>
              </span>
            </li>
          </Reveal>
        ))}
      </ul>

      {!loading && !error && offerings.length === 0 && (
        <p className="empty-state">
          No offerings match those filters yet. Try a different area or category.
        </p>
      )}

      <details className="formula-details">
        <summary>How the match score is calculated</summary>
        <ul className="formula-plain">
          {MATCH_FORMULA.map((item) => (
            <li key={item.label}>
              <strong>{item.label} — up to {item.points} points.</strong> {item.text}
            </li>
          ))}
        </ul>
      </details>
    </main>
  );
}
