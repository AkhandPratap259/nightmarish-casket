import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatMinutes } from '../api';
import RecipeArt from '../components/RecipeArt';
import { CUISINES, CATEGORIES, DIFFICULTIES } from '../data/content';

export default function Browse() {
  const [recipes, setRecipes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ q: '', cuisine: '', category: '', difficulty: '', maxTotalTime: '', sort: 'newest' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 12, sort: filters.sort };
      if (filters.q) params.q = filters.q;
      if (filters.cuisine) params.cuisine = filters.cuisine;
      if (filters.category) params.category = filters.category;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.maxTotalTime) params.maxTotalTime = filters.maxTotalTime;
      const data = await api.listRecipes(params);
      setRecipes(data.recipes || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (e) {
      setError(e.message || 'Could not load recipes');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  function setFilter(key, value) {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <main className="page browse-page">
      <p className="section-label">(01) — Browse</p>
      <h1>Find tonight’s <em>recipe</em></h1>
      <p className="muted">Search by dish or ingredient, then narrow by cuisine, time and difficulty. Results update as you filter.</p>

      <form className="filter-bar" role="search" aria-label="Recipe filters" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor="filter-q">Search</label>
          <input id="filter-q" type="search" value={filters.q} onChange={(e) => setFilter('q', e.target.value)} placeholder="Dish or ingredient, e.g. paneer" />
        </div>
        <div className="field">
          <label htmlFor="filter-cuisine">Cuisine</label>
          <select id="filter-cuisine" value={filters.cuisine} onChange={(e) => setFilter('cuisine', e.target.value)}>
            <option value="">All cuisines</option>
            {CUISINES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-category">Category</label>
          <select id="filter-category" value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-difficulty">Difficulty</label>
          <select id="filter-difficulty" value={filters.difficulty} onChange={(e) => setFilter('difficulty', e.target.value)}>
            <option value="">Any difficulty</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-time">Max total time</label>
          <select id="filter-time" value={filters.maxTotalTime} onChange={(e) => setFilter('maxTotalTime', e.target.value)}>
            <option value="">Any time</option>
            <option value="20">20 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-sort">Sort</label>
          <select id="filter-sort" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}>
            <option value="newest">Newest</option>
            <option value="top-rated">Top rated</option>
            <option value="quickest">Quickest</option>
            <option value="most-cooked">Most cooked</option>
          </select>
        </div>
      </form>

      <p className="muted" role="status" aria-live="polite">
        {loading ? 'Loading recipes…' : `${total} recipe${total === 1 ? '' : 's'} found`}
      </p>
      {error && <p className="error-text" role="alert">{error}</p>}

      <div className="recipe-grid stack-in">
        {recipes.map((r) => (
          <Link key={r._id} className="recipe-card" to={`/recipes/${r._id}`}>
            <RecipeArt cuisine={r.cuisine} title={r.title} />
            <span className="deck-body">
              <span className="deck-title">{r.title}</span>
              <span className="deck-meta">{r.cuisine} · {r.category} · {r.difficulty} · {formatMinutes(r.prepTimeMin + r.cookTimeMin)} · serves {r.servings}</span>
              <span className="ruled-desc">{r.description}</span>
              <span className="deck-foot">
                <span className="deck-rating">★ {(r.ratingAvg || 0).toFixed(1)} ({r.ratingCount || 0}) · cooked {r.timesCooked || 0}×</span>
                <span className="deck-tag">{r.cuisine}</span>
              </span>
            </span>
          </Link>
        ))}
      </div>
      {!loading && recipes.length === 0 && !error && (
        <p className="muted">No recipes match those filters yet. Try clearing a filter.</p>
      )}

      {pages > 1 && (
        <div className="pagination">
          <button type="button" className="btn btn-ghost btn-small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Previous</button>
          <span aria-live="polite">Page {page} of {pages}</span>
          <button type="button" className="btn btn-ghost btn-small" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </main>
  );
}
