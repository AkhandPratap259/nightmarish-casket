import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Collections({ user }) {
  const [collections, setCollections] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listCollections();
      setCollections(data.collections || []);
    } catch (e) {
      setError(e.message || 'Could not load collections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) load(); else setLoading(false); }, [user, load]);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createCollection({ name, description });
      setName('');
      setDescription('');
      setStatus('Collection created.');
      load();
    } catch (err) {
      setError(err.message || 'Could not create the collection');
    }
  }

  async function removeCollection(id) {
    try {
      await api.deleteCollection(id);
      setStatus('Collection deleted.');
      load();
    } catch (err) {
      setStatus(err.message || 'Could not delete the collection');
    }
  }

  async function removeRecipe(collectionId, recipeId) {
    try {
      await api.removeFromCollection(collectionId, recipeId);
      setStatus('Recipe removed from the collection.');
      load();
    } catch (err) {
      setStatus(err.message || 'Could not remove that recipe');
    }
  }

  if (!user) {
    return (
      <main className="page">
        <h1>My <em>collections</em></h1>
        <p className="muted">Sign in to build collections of recipes.</p>
        <p><Link className="btn btn-primary" to="/login">Sign in</Link></p>
      </main>
    );
  }

  return (
    <main className="page">
      <p className="section-label">(01) — Collections</p>
      <h1>My <em>collections</em></h1>
      <p className="muted">Named groups of recipes — weeknight favourites, weekend cooking, whatever you cook most. Add recipes from any recipe page.</p>

      <form className="collection-form" onSubmit={create}>
        <div className="field">
          <label htmlFor="col-name">Collection name</label>
          <input id="col-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weeknight favourites" required />
        </div>
        <div className="field">
          <label htmlFor="col-desc">Description (optional)</label>
          <input id="col-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What goes in here?" />
        </div>
        <button type="submit" className="btn btn-primary">Create collection</button>
      </form>
      {status && <p className="muted small" role="status" aria-live="polite">{status}</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
      {loading && <p role="status">Loading…</p>}

      <div className="collections-list">
        {collections.map((c, i) => (
          <section key={c.id} className="collection-block" aria-labelledby={`col-${c.id}`}>
            <div className="collection-head">
              <span className="ruled-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h2 id={`col-${c.id}`}>{c.name}</h2>
                {c.description && <p className="muted small">{c.description}</p>}
              </div>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => removeCollection(c.id)}>Delete collection</button>
            </div>
            {c.recipes.length === 0 ? (
              <p className="muted small">No recipes in this collection yet.</p>
            ) : (
              <ul className="ruled-list">
                {c.recipes.map((r) => (
                  <li key={r._id} className="ruled-row">
                    <div className="ruled-main">
                      <Link className="ruled-title" to={`/recipes/${r._id}`}>{r.title}</Link>
                      <p className="muted small">{r.cuisine} · {r.category}</p>
                    </div>
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => removeRecipe(c.id, r._id)}>Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      {!loading && collections.length === 0 && !error && <p className="muted">No collections yet — create your first one above.</p>}
    </main>
  );
}
