import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, formatMinutes, getStoredUser, userIdOf } from '../api';
import { getSocket } from '../socket';
import Dialog from '../components/Dialog';

function ProgressRing({ value, size = 120 }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0, value)));
  return (
    <svg className="progress-ring" width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`Cooking progress ${Math.round(value * 100)} percent`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#ede2c9" strokeWidth="8" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="#c4552d" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 60 60)" />
      <text x="60" y="66" textAnchor="middle" className="progress-ring-text">{Math.round(value * 100)}%</text>
    </svg>
  );
}

function CookMode({ recipe, onClose, onFinished }) {
  const steps = recipe.steps || [];
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!running) return undefined;
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [running]);

  useEffect(() => {
    setSeconds(0);
    setRunning(false);
  }, [index]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  function finish() {
    setDone(true);
    setRunning(false);
    if (!saved) {
      setSaved(true);
      api.markCooked(recipe._id).then(() => onFinished()).catch(() => {});
    }
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const progress = steps.length ? (done ? 1 : index / steps.length) : 0;

  return (
    <div className="cookmode" role="dialog" aria-modal="true" aria-label={`Cook Mode: ${recipe.title}`}>
      <div className="cookmode-inner">
        <div className="cookmode-head">
          <p className="section-label">Cook Mode — {recipe.title}</p>
          <button type="button" className="btn btn-ghost btn-small" onClick={onClose}>Exit Cook Mode</button>
        </div>
        {done ? (
          <div className="cookmode-done">
            <ProgressRing value={1} />
            <h2>Done — <em>well cooked.</em></h2>
            <p className="muted">This recipe has been counted as cooked once. Enjoy your meal.</p>
            <button type="button" className="btn btn-primary" onClick={onClose}>Back to the recipe</button>
          </div>
        ) : (
          <>
            <div className="cookmode-progress">
              <ProgressRing value={progress} />
              <p className="muted">Step {index + 1} of {steps.length}</p>
            </div>
            <p className="cookmode-step" key={index}>{steps[index]?.text}</p>
            <div className="cookmode-timer" aria-live="polite">
              <span className="cookmode-time">{mm}:{ss}</span>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setRunning((v) => !v)}>
                {running ? 'Pause timer' : 'Start timer'}
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => { setSeconds(0); setRunning(false); }}>Reset</button>
            </div>
            <div className="cookmode-nav">
              <button type="button" className="btn btn-ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>← Previous step</button>
              {index < steps.length - 1 ? (
                <button type="button" className="btn btn-primary" onClick={() => setIndex((i) => i + 1)}>Next step →</button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={finish}>Finish cooking</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function RecipeDetail({ user }) {
  const { id } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [servings, setServings] = useState(0);
  const [baseServings, setBaseServings] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [stars, setStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [cookMode, setCookMode] = useState(false);
  const [collections, setCollections] = useState([]);
  const [collectionDialog, setCollectionDialog] = useState(false);
  const [collectionStatus, setCollectionStatus] = useState('');
  const storedUser = getStoredUser();
  const myId = userIdOf(user || storedUser);

  const load = useCallback(async (serv) => {
    const data = await api.getRecipe(id, serv || undefined);
    setRecipe(data.recipe);
    setServings(data.recipe.servings);
    // The API returns the scaled servings in `recipe.servings`, so remember
    // the recipe's own base servings from the unscaled first load.
    if (!serv) setBaseServings(data.recipe.servings);
    const rev = await api.listReviews(id);
    setReviews(rev.reviews || []);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load().catch((e) => setError(e.message || 'Recipe not found')).finally(() => setLoading(false));
    if (user) api.listCollections().then((d) => setCollections(d.collections || [])).catch(() => {});
    const socket = getSocket(myId || null);
    socket.emit('join-recipe', id);
    const onReview = () => { load(servings || undefined).catch(() => {}); };
    socket.on('review:updated', onReview);
    return () => { socket.off('review:updated', onReview); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!recipe || servings === recipe.servings) return;
    const t = setTimeout(() => {
      api.getRecipe(id, servings).then((d) => setRecipe(d.recipe)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servings]);

  async function submitReview(e) {
    e.preventDefault();
    setReviewError('');
    setReviewStatus('');
    if (!user) return setReviewError('Sign in to leave a review.');
    try {
      await api.addReview(id, { stars, text: reviewText });
      setReviewStatus('Review saved.');
      const rev = await api.listReviews(id);
      setReviews(rev.reviews || []);
      const data = await api.getRecipe(id, servings || undefined);
      setRecipe(data.recipe);
    } catch (err) {
      setReviewError(err.message || 'Could not save the review');
    }
  }

  async function handleReport() {
    try {
      await api.reportRecipe(id);
      setStatus('Thanks — this recipe has been flagged for moderation.');
    } catch (err) {
      setStatus(err.message || 'Could not report this recipe');
    }
  }

  async function addToCollection(collectionId) {
    setCollectionStatus('');
    try {
      await api.addToCollection(collectionId, id);
      setCollectionStatus('Added to the collection.');
    } catch (err) {
      setCollectionStatus(err.message || 'Could not add to the collection');
    }
  }

  if (loading) return <main className="page"><p role="status">Loading recipe…</p></main>;
  if (error || !recipe) {
    return (
      <main className="page">
        <h1>Recipe not <em>found</em></h1>
        <p className="muted">{error || 'This recipe may have been hidden or removed.'}</p>
        <p><Link to="/browse">Back to Browse</Link></p>
      </main>
    );
  }

  const nutrition = recipe.nutrition;
  const myReview = reviews.find((r) => String(r.userId) === String(myId));

  return (
    <main className="page recipe-page">
      <p className="section-label">(01) — {recipe.cuisine} · {recipe.category}</p>
      <h1>{recipe.title}</h1>
      <p className="recipe-meta">
        {recipe.author?.name ? `By ${recipe.author.name}` : 'By a FlavorForge cook'} · {recipe.difficulty} ·{' '}
        {formatMinutes(recipe.prepTimeMin + recipe.cookTimeMin)} total · ★ {(recipe.ratingAvg || 0).toFixed(1)} ({recipe.ratingCount || 0} reviews) · cooked {recipe.timesCooked || 0} times
      </p>
      <p className="recipe-desc">{recipe.description}</p>
      <div className="recipe-actions">
        <button type="button" className="btn btn-primary" onClick={() => setCookMode(true)}>Start Cook Mode</button>
        {user && (
          <button type="button" className="btn btn-ghost" onClick={() => setCollectionDialog(true)}>Save to collection</button>
        )}
        {user && (
          <button type="button" className="btn btn-ghost btn-small" onClick={handleReport}>Report recipe</button>
        )}
      </div>
      {status && <p className="muted small" role="status">{status}</p>}

      <div className="recipe-split">
        <section className="recipe-ingredients" aria-labelledby="ing-title">
          <h2 id="ing-title">Ingredients</h2>
          <div className="scaler">
            <label htmlFor="servings-slider">Servings: <strong>{servings}</strong> <span className="muted small">(base: {baseServings || recipe.servings} — drag to rescale)</span></label>
            <input
              id="servings-slider"
              type="range"
              min="1"
              max="12"
              step="1"
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              aria-describedby="scaler-note"
            />
            <p id="scaler-note" className="muted small">Quantities update live as you drag.</p>
          </div>
          <ul className="ingredient-list">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="ingredient-row">
                <span className="ingredient-qty">{ing.quantity} {ing.unit}</span>
                <span>{ing.name}</span>
              </li>
            ))}
          </ul>
          {recipe.tags?.length > 0 && (
            <p className="muted small">Tags: {recipe.tags.join(', ')}</p>
          )}
        </section>

        <section className="recipe-steps" aria-labelledby="steps-title">
          <h2 id="steps-title">Method</h2>
          <ol className="steps-list">
            {(recipe.steps || []).slice().sort((a, b) => a.order - b.order).map((s) => (
              <li key={s.order} className="step-row">
                <span className="step-num" aria-hidden="true">{String(s.order).padStart(2, '0')}</span>
                <span>{s.text}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="nutrition-panel" aria-labelledby="nutrition-title">
        <h2 id="nutrition-title">Nutrition — <em>estimate</em> per serving</h2>
        {nutrition?.perServing ? (
          <div className="nutrition-grid">
            <div><strong>{nutrition.perServing.calories}</strong><span>kcal</span></div>
            <div><strong>{nutrition.perServing.protein} g</strong><span>protein</span></div>
            <div><strong>{nutrition.perServing.carbs} g</strong><span>carbs</span></div>
            <div><strong>{nutrition.perServing.fat} g</strong><span>fat</span></div>
          </div>
        ) : (
          <p className="muted">No nutrition estimate is available for this recipe yet.</p>
        )}
        <p className="muted small">{nutrition?.note}</p>
        {nutrition?.notEstimated?.length > 0 && (
          <p className="muted small">Not estimated: {nutrition.notEstimated.join(', ')}</p>
        )}
      </section>

      <section className="reviews" aria-labelledby="reviews-title">
        <h2 id="reviews-title">Reviews ({reviews.length})</h2>
        <ul className="review-list">
          {reviews.map((r) => (
            <li key={r.id} className="review-row">
              <strong>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</strong>
              <span>{r.text || 'No written review.'}</span>
              <em className="muted small">— {r.user}</em>
            </li>
          ))}
          {reviews.length === 0 && <li className="muted">No reviews yet — be the first to cook and rate it.</li>}
        </ul>
        <form className="review-form" onSubmit={submitReview}>
          <h3>{myReview ? 'Update your review' : 'Leave a review'}</h3>
          <div className="field">
            <label htmlFor="review-stars">Stars (1–5)</label>
            <select id="review-stars" value={stars} onChange={(e) => setStars(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="review-text">Your review</label>
            <textarea id="review-text" rows="3" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="How did it turn out?" />
          </div>
          {reviewError && <p className="error-text" role="alert">{reviewError}</p>}
          {reviewStatus && <p className="muted small" role="status" aria-live="polite">{reviewStatus}</p>}
          <button type="submit" className="btn btn-primary" disabled={!user}>{user ? 'Save review' : 'Sign in to review'}</button>
        </form>
      </section>

      <Dialog open={collectionDialog} onClose={() => setCollectionDialog(false)} title="Save to a collection">
        {collections.length === 0 ? (
          <p className="muted">You have no collections yet. Create one from the Collections page first.</p>
        ) : (
          <ul className="dialog-list">
            {collections.map((c) => (
              <li key={c.id}>
                <button type="button" className="btn btn-ghost dialog-list-btn" onClick={() => addToCollection(c.id)}>
                  {c.name} ({c.recipeCount} recipes)
                </button>
              </li>
            ))}
          </ul>
        )}
        {collectionStatus && <p className="muted small" role="status">{collectionStatus}</p>}
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setCollectionDialog(false)}>Close</button>
      </Dialog>

      {cookMode && (
        <CookMode
          recipe={recipe}
          onClose={() => setCookMode(false)}
          onFinished={() => {
            setRecipe((r) => (r ? { ...r, timesCooked: (r.timesCooked || 0) + 1 } : r));
          }}
        />
      )}
    </main>
  );
}
