import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Dialog from '../components/Dialog';
import { CATEGORIES, CUISINES, DIFFICULTIES } from '../data/content';

const EMPTY_FORM = {
  title: '', description: '', cuisine: 'Indian', category: 'Main', difficulty: 'Easy',
  prepTimeMin: 10, cookTimeMin: 20, servings: 4,
  ingredients: [{ name: '', quantity: 100, unit: 'g' }],
  steps: [{ order: 1, text: '' }],
  tags: '',
};

export default function MyRecipes({ user }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [dialog, setDialog] = useState(null); // 'new' | recipe object | null
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listRecipes({ mine: 1, limit: 50, sort: 'newest' });
      setRecipes(data.recipes || []);
    } catch (e) {
      setError(e.message || 'Could not load your recipes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) load(); else setLoading(false); }, [user, load]);

  function openNew() {
    setForm(EMPTY_FORM);
    setFormError('');
    setDialog('new');
  }

  function openEdit(recipe) {
    setForm({
      title: recipe.title,
      description: recipe.description,
      cuisine: recipe.cuisine,
      category: recipe.category,
      difficulty: recipe.difficulty,
      prepTimeMin: recipe.prepTimeMin,
      cookTimeMin: recipe.cookTimeMin,
      servings: recipe.servings,
      ingredients: recipe.ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
      steps: recipe.steps.map((s) => ({ order: s.order, text: s.text })),
      tags: (recipe.tags || []).join(', '),
    });
    setFormError('');
    setDialog(recipe);
  }

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateIngredient(i, key, value) {
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.map((ing, idx) => (idx === i ? { ...ing, [key]: value } : ing)),
    }));
  }

  function updateStep(i, value) {
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, idx) => (idx === i ? { ...s, text: value } : s)),
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    const body = {
      ...form,
      prepTimeMin: Number(form.prepTimeMin),
      cookTimeMin: Number(form.cookTimeMin),
      servings: Number(form.servings),
      ingredients: form.ingredients.map((i) => ({ ...i, quantity: Number(i.quantity) })),
      steps: form.steps.map((s, i) => ({ order: i + 1, text: s.text })),
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    try {
      if (dialog === 'new') {
        await api.createRecipe(body);
        setStatus('Recipe created.');
      } else {
        await api.updateRecipe(dialog._id, body);
        setStatus('Recipe updated.');
      }
      setDialog(null);
      load();
    } catch (err) {
      setFormError(err.message || 'Could not save the recipe');
    }
  }

  async function confirmDelete() {
    try {
      await api.deleteRecipe(deleteTarget._id);
      setStatus('Recipe deleted.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      setStatus(err.message || 'Could not delete the recipe');
      setDeleteTarget(null);
    }
  }

  if (!user) {
    return (
      <main className="page">
        <h1>My <em>recipes</em></h1>
        <p className="muted">Sign in to create and manage your own recipes.</p>
        <p><Link className="btn btn-primary" to="/login">Sign in</Link></p>
      </main>
    );
  }

  return (
    <main className="page">
      <p className="section-label">(01) — My recipes</p>
      <h1>My <em>recipes</em></h1>
      <p className="muted">Recipes you authored. Edit or delete your own — admins can also hide any recipe from the Admin page.</p>
      <button type="button" className="btn btn-primary" onClick={openNew}>+ New recipe</button>
      {status && <p className="muted small" role="status" aria-live="polite">{status}</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
      {loading && <p role="status">Loading…</p>}
      <ol className="ruled-list my-recipes-list">
        {recipes.map((r, i) => (
          <li key={r._id} className="ruled-row">
            <span className="ruled-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <div className="ruled-main">
              <Link className="ruled-title" to={`/recipes/${r._id}`}>{r.title}</Link>
              <p className="muted small">{r.cuisine} · {r.category} · {r.difficulty} · ★ {(r.ratingAvg || 0).toFixed(1)} ({r.ratingCount || 0}) · cooked {r.timesCooked || 0}×</p>
            </div>
            <span className="row-actions">
              <button type="button" className="btn btn-ghost btn-small" onClick={() => openEdit(r)}>Edit</button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setDeleteTarget(r)}>Delete</button>
            </span>
          </li>
        ))}
      </ol>
      {!loading && recipes.length === 0 && !error && <p className="muted">You have not published a recipe yet — start with one above.</p>}

      <Dialog open={!!dialog} onClose={() => setDialog(null)} title={dialog === 'new' ? 'New recipe' : 'Edit recipe'}>
        <form className="recipe-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="rf-title">Title</label>
            <input id="rf-title" value={form.title} onChange={(e) => updateField('title', e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="rf-desc">Description</label>
            <textarea id="rf-desc" rows="3" value={form.description} onChange={(e) => updateField('description', e.target.value)} required />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="rf-cuisine">Cuisine</label>
              <select id="rf-cuisine" value={form.cuisine} onChange={(e) => updateField('cuisine', e.target.value)}>
                {CUISINES.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="rf-category">Category</label>
              <select id="rf-category" value={form.category} onChange={(e) => updateField('category', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="rf-difficulty">Difficulty</label>
              <select id="rf-difficulty" value={form.difficulty} onChange={(e) => updateField('difficulty', e.target.value)}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="rf-prep">Prep (min)</label>
              <input id="rf-prep" type="number" min="0" value={form.prepTimeMin} onChange={(e) => updateField('prepTimeMin', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="rf-cook">Cook (min)</label>
              <input id="rf-cook" type="number" min="0" value={form.cookTimeMin} onChange={(e) => updateField('cookTimeMin', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="rf-servings">Servings</label>
              <input id="rf-servings" type="number" min="1" max="24" value={form.servings} onChange={(e) => updateField('servings', e.target.value)} />
            </div>
          </div>
          <fieldset className="form-fieldset">
            <legend>Ingredients</legend>
            {form.ingredients.map((ing, i) => (
              <div key={i} className="form-row ingredient-row">
                <div className="field"><label htmlFor={`ing-name-${i}`}>Name</label><input id={`ing-name-${i}`} value={ing.name} onChange={(e) => updateIngredient(i, 'name', e.target.value)} placeholder="e.g. tomato" /></div>
                <div className="field"><label htmlFor={`ing-qty-${i}`}>Qty</label><input id={`ing-qty-${i}`} type="number" min="0" step="any" value={ing.quantity} onChange={(e) => updateIngredient(i, 'quantity', e.target.value)} /></div>
                <div className="field"><label htmlFor={`ing-unit-${i}`}>Unit</label><input id={`ing-unit-${i}`} value={ing.unit} onChange={(e) => updateIngredient(i, 'unit', e.target.value)} placeholder="g, ml, piece" /></div>
                <button type="button" className="btn btn-ghost btn-small" aria-label={`Remove ingredient ${i + 1}`} onClick={() => setForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }))}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setForm((f) => ({ ...f, ingredients: [...f.ingredients, { name: '', quantity: 100, unit: 'g' }] }))}>+ Add ingredient</button>
          </fieldset>
          <fieldset className="form-fieldset">
            <legend>Steps</legend>
            {form.steps.map((s, i) => (
              <div key={i} className="field">
                <label htmlFor={`step-${i}`}>Step {i + 1}</label>
                <textarea id={`step-${i}`} rows="2" value={s.text} onChange={(e) => updateStep(i, e.target.value)} />
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setForm((f) => ({ ...f, steps: [...f.steps, { order: f.steps.length + 1, text: '' }] }))}>+ Add step</button>
          </fieldset>
          <div className="field">
            <label htmlFor="rf-tags">Tags (comma separated)</label>
            <input id="rf-tags" value={form.tags} onChange={(e) => updateField('tags', e.target.value)} placeholder="veg, quick" />
          </div>
          {formError && <p className="error-text" role="alert">{formError}</p>}
          <div className="dialog-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setDialog(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{dialog === 'new' ? 'Create recipe' : 'Save changes'}</button>
          </div>
        </form>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete this recipe?">
        <p>“{deleteTarget?.title}” will be removed, along with its reviews. This cannot be undone.</p>
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Keep it</button>
          <button type="button" className="btn btn-primary" onClick={confirmDelete}>Delete recipe</button>
        </div>
      </Dialog>
    </main>
  );
}
