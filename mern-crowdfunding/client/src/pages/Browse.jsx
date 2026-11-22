import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { CATEGORIES, SORT_OPTIONS, STATUS_LABELS, formatINR, categoryLabel } from '../data/config';
import FundingBar from '../components/FundingBar';
import CampaignArt from '../components/CampaignArt';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'funded', label: 'Funded' },
  { value: 'failed', label: 'Failed' },
];

export default function Browse({ onGo }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ campaigns: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animating, setAnimating] = useState(false);
  const debounce = useRef(null);

  const load = useCallback((params) => {
    setLoading(true);
    setError('');
    api
      .campaigns(params)
      .then((res) => setData({ campaigns: res.campaigns || [], pages: res.pages || 1, total: res.total || 0 }))
      .catch((e) => setError(e.message || 'Could not load campaigns.'))
      .finally(() => setLoading(false));
  }, []);

  // Debounced search; category/sort/status/page apply immediately.
  useEffect(() => {
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => {
      setAnimating(true);
      load({ search, category, sort, status, page, limit: 10 });
      window.setTimeout(() => setAnimating(false), 320);
    }, 300);
    return () => {
      if (debounce.current) window.clearTimeout(debounce.current);
    };
  }, [search, category, sort, status, page, load]);

  function resetPage(fn) {
    setPage(1);
    fn();
  }

  return (
    <div className="page browse">
      <p className="section-label">Browse</p>
      <h1>Find a campaign <em>worth backing.</em></h1>
      <p className="page-sub">
        Search, filter by category and status, and sort by what matters to you. Campaigns labelled “Sample campaign”
        are seeded examples.
      </p>

      <div className="filters" role="search">
        <div className="field filter-search">
          <label htmlFor="browse-search">Search campaigns</label>
          <input
            id="browse-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by title or story…"
          />
        </div>
        <div className="field">
          <label htmlFor="browse-sort">Sort by</label>
          <select id="browse-sort" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label id="status-label">Status</label>
          <div className="chip-row" role="group" aria-labelledby="status-label">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value || 'all'}
                type="button"
                className={`chip${status === f.value ? ' is-active' : ''}`}
                aria-pressed={status === f.value}
                onClick={() => { setStatus(f.value); setPage(1); }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="chip-row category-chips" role="group" aria-label="Filter by category">
        <button
          type="button"
          className={`chip${category === '' ? ' is-active' : ''}`}
          aria-pressed={category === ''}
          onClick={() => resetPage(() => setCategory(''))}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`chip${category === c.value ? ' is-active' : ''}`}
            aria-pressed={category === c.value}
            onClick={() => resetPage(() => setCategory(c.value))}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p className="results-count" aria-live="polite">
        {loading ? 'Loading…' : `${data.total} campaign${data.total === 1 ? '' : 's'}`}
      </p>

      {error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : !loading && data.campaigns.length === 0 ? (
        <p className="empty-note">No campaigns match these filters. Try clearing the search or picking another category.</p>
      ) : (
        <ol className={`ruled-list browse-list${animating ? ' is-animating' : ''}`}>
          {data.campaigns.map((c, i) => (
            <li key={c._id} className="ruled-row browse-row">
              <button type="button" className="browse-btn spot-card" onClick={() => onGo({ name: 'campaign', id: c._id })}>
                <span className="row-index" aria-hidden="true">{String((page - 1) * 10 + i + 1).padStart(2, '0')}</span>
                <CampaignArt title={c.title} category={c.category} size="small" />
                <span className="browse-main">
                  <span className="browse-title">
                    {c.title}
                    {c.isSample ? <span className="sample-tag">Sample campaign</span> : null}
                  </span>
                  <span className="browse-meta">
                    {categoryLabel(c.category)} · {STATUS_LABELS[c.status] || c.status} · by {c.creator?.name || 'Unknown creator'}
                  </span>
                  <FundingBar pledged={c.pledgedTotal} goal={c.goal} stretchGoals={c.stretchGoals} />
                </span>
                <span className="browse-figures">
                  <span className="browse-pledged">{formatINR(c.pledgedTotal)}</span>
                  <span className="browse-goal">of {formatINR(c.goal)}</span>
                  <span className="browse-days">{c.daysLeft != null ? `${c.daysLeft} days left` : ''}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {data.pages > 1 ? (
        <nav className="pagination" aria-label="Campaign pages">
          <button type="button" className="btn btn-ghost btn-small" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            ← Previous
          </button>
          <span aria-live="polite">Page {page} of {data.pages}</span>
          <button type="button" className="btn btn-ghost btn-small" disabled={page >= data.pages} onClick={() => setPage((p) => Math.min(data.pages, p + 1))}>
            Next →
          </button>
        </nav>
      ) : null}
    </div>
  );
}
