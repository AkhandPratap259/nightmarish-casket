import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Admin({ user }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminOverview();
      setOverview(data);
    } catch (e) {
      setError(e.message || 'Could not load the admin overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user?.role === 'admin') load(); else setLoading(false); }, [user, load]);

  async function toggleHide(recipe, hide) {
    try {
      if (hide) await api.hideRecipe(recipe.id);
      else await api.unhideRecipe(recipe.id);
      setStatus(hide ? 'Recipe hidden from the public library.' : 'Recipe visible again.');
      load();
    } catch (e) {
      setStatus(e.message || 'Could not update that recipe');
    }
  }

  if (!user) {
    return (
      <main className="page">
        <h1>Admin <em>overview</em></h1>
        <p className="muted">Sign in as an admin to view this page.</p>
        <p><Link className="btn btn-primary" to="/login">Sign in</Link></p>
      </main>
    );
  }

  if (user.role !== 'admin') {
    return (
      <main className="page">
        <h1>Admin <em>overview</em></h1>
        <p className="muted">This page is for admins only. Your account is a cook account.</p>
        <p><Link to="/browse">Back to Browse</Link></p>
      </main>
    );
  }

  return (
    <main className="page admin-page">
      <p className="section-label">(01) — Admin</p>
      <h1>Admin <em>overview</em></h1>
      {loading && <p role="status">Loading…</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
      {status && <p className="muted small" role="status" aria-live="polite">{status}</p>}
      {overview && (
        <>
          <div className="stat-row admin-stats">
            <div className="stat"><span className="stat-num">{overview.users}</span><span className="stat-label">Users</span></div>
            <div className="stat"><span className="stat-num">{overview.recipes}</span><span className="stat-label">Recipes</span></div>
            <div className="stat"><span className="stat-num">{overview.reviews}</span><span className="stat-label">Reviews</span></div>
            <div className="stat"><span className="stat-num">{overview.plans}</span><span className="stat-label">Planned meals</span></div>
          </div>

          <section aria-labelledby="flagged-title">
            <h2 id="flagged-title">Flagged recipes ({overview.flaggedRecipes.length})</h2>
            {overview.flaggedRecipes.length === 0 ? (
              <p className="muted">No recipes are currently flagged for moderation.</p>
            ) : (
              <ul className="ruled-list">
                {overview.flaggedRecipes.map((r) => (
                  <li key={r.id} className="ruled-row">
                    <div className="ruled-main">
                      <Link className="ruled-title" to={`/recipes/${r.id}`}>{r.title}</Link>
                      <p className="muted small">{r.cuisine} · by {r.author || 'unknown'} · {r.hidden ? 'hidden' : 'visible'}</p>
                    </div>
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => toggleHide(r, !r.hidden)}>
                      {r.hidden ? 'Unhide' : 'Hide'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="users-title">
            <h2 id="users-title">Newest users</h2>
            <ul className="ruled-list">
              {overview.newestUsers.map((u) => (
                <li key={u.id} className="ruled-row">
                  <div className="ruled-main">
                    <strong>{u.name}</strong>
                    <p className="muted small">{u.email} · {u.role}</p>
                  </div>
                  <span className="muted small">{new Date(u.createdAt).toLocaleDateString('en-IN')}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
