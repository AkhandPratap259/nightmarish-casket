import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Reveal from '../components/Reveal';
import CountUp from '../components/CountUp';
import RecipeArt from '../components/RecipeArt';
import JourneyPath from '../components/JourneyPath';
import StreakChart from '../components/StreakChart';
import { HOW_IT_WORKS } from '../data/content';

export default function Home({ user }) {
  const [stats, setStats] = useState(null);
  const [topRated, setTopRated] = useState([]);
  const [error, setError] = useState('');
  const deckRef = useRef(null);

  useEffect(() => {
    api.stats().then(setStats).catch(() => setError('Stats are unavailable right now.'));
    api.listRecipes({ sort: 'top-rated', limit: 6 }).then((d) => setTopRated(d.recipes || [])).catch(() => {});
  }, []);

  function scrollDeck(dir) {
    const deck = deckRef.current;
    if (!deck) return;
    const card = deck.querySelector('.deck-card');
    const step = card ? card.getBoundingClientRect().width + 20 : 340;
    deck.scrollBy({ left: dir * step, behavior: 'smooth' });
  }

  return (
    <main className="page home-page">
      {/* Command-centre hero: headline panel + week-plan panel + live stats */}
      <section className="hero" aria-labelledby="home-title">
        <div className="hero-left">
          <p className="section-label">Recipe sharing &amp; meal planning</p>
          <h1 id="home-title" aria-label="Cook what you love. Plan the week. Shop once.">
            Cook what you <span className="squiggle">love.</span><br />Plan the week.<br />Shop once.
          </h1>
          <p className="hero-sub">
            FlavorForge is a recipe library with a serving scaler, a drag-and-drop
            week planner and a grocery list that builds itself from your plan.
          </p>
          <div className="hero-ctas">
            <Link className="btn btn-primary" to="/browse">Browse recipes</Link>
            <Link className="btn btn-ghost" to={user ? '/planner' : '/login'}>
              {user ? 'Open my planner' : 'Plan the week'}
            </Link>
          </div>
          <p className="hero-note">Seed recipes are demo data. No payment, no sign-up wall to browse.</p>
        </div>
        <div className="hero-right">
          <div className="hero-plan-panel" aria-label="Illustrative preview of a week plan">
            <p className="hero-right-label">This week, on the plan</p>
            <ol className="hero-plan">
              <li><span>Mon</span><strong>Chole Masala</strong><em>dinner · 4 servings</em></li>
              <li><span>Tue</span><strong>Paneer Butter Masala</strong><em>dinner · 4 servings</em></li>
              <li><span>Wed</span><strong>Veg Hakka Noodles</strong><em>lunch · 3 servings</em></li>
              <li><span>Thu</span><strong>Thai Green Curry</strong><em>dinner · 4 servings</em></li>
            </ol>
            <p className="small">Illustrative preview — sample plan shown in the design, not a live account.</p>
          </div>
          <div className="hero-stats-mini" aria-label="FlavorForge at a glance">
            <div className="stat">
              <span className="stat-num"><CountUp value={stats ? stats.totalRecipes : 0} /></span>
              <span className="stat-label">Recipes</span>
            </div>
            <div className="stat">
              <span className="stat-num"><CountUp value={stats ? stats.cuisines : 0} /></span>
              <span className="stat-label">Cuisines</span>
            </div>
            <div className="stat">
              <span className="stat-num"><CountUp value={stats ? stats.timesCooked : 0} /></span>
              <span className="stat-label">Times cooked</span>
            </div>
          </div>
        </div>
      </section>
      {error && <p className="muted small" role="status">{error}</p>}

      {user && <StreakChart />}

      <section className="home-featured" aria-labelledby="featured-title">
        <Reveal>
          <p className="section-label">Top rated</p>
          <h2 id="featured-title">Loved by the <em>cooks</em> who tried them</h2>
          <p className="muted">Swipe the deck — or use the arrows — to browse the highest-rated recipes.</p>
        </Reveal>
        <div className="deck-wrap">
          <div className="deck stack-in" ref={deckRef}>
            {topRated.map((r) => (
              <Link key={r._id} className="deck-card" to={`/recipes/${r._id}`}>
                <RecipeArt cuisine={r.cuisine} title={r.title} />
                <span className="deck-body">
                  <span className="deck-title">{r.title}</span>
                  <span className="deck-meta">{r.cuisine} · {r.category} · {r.prepTimeMin + r.cookTimeMin} min total</span>
                  <span className="deck-foot">
                    <span className="deck-rating">★ {(r.ratingAvg || 0).toFixed(1)} · {r.ratingCount || 0} reviews</span>
                    <span className="deck-tag">{r.difficulty}</span>
                  </span>
                </span>
              </Link>
            ))}
            {topRated.length === 0 && (
              <p className="muted">No top-rated recipes yet — check back after the first reviews land.</p>
            )}
          </div>
          <div className="deck-nav">
            <button type="button" className="btn btn-ghost" onClick={() => scrollDeck(-1)} aria-label="Previous recipes">←</button>
            <button type="button" className="btn btn-ghost" onClick={() => scrollDeck(1)} aria-label="Next recipes">→</button>
            <Link className="btn btn-ghost" to="/browse">See all recipes →</Link>
          </div>
        </div>
      </section>

      <section className="home-how" aria-labelledby="how-title">
        <Reveal>
          <p className="section-label">How it works</p>
          <h2 id="how-title">From craving to <em>cooked</em> in three moves</h2>
          <p className="muted">Follow the path — it draws itself as you scroll.</p>
        </Reveal>
        <JourneyPath steps={HOW_IT_WORKS} />
        <div className="how-grid stack-in">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.num} className="how-step">
              <p className="how-num">{s.num}</p>
              <h3>{s.title}</h3>
              <p className="muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-closing" aria-labelledby="closing-title">
        <div className="home-closing-text">
          <p className="section-label">Start cooking</p>
          <h2 id="closing-title">Your week deserves a <em>better</em> plan than “what’s in the fridge?”</h2>
          <p>Pick a recipe, scale it to your table, drop it on the planner — the list writes itself.</p>
          <Link className="btn btn-primary" to={user ? '/planner' : '/register'}>
            {user ? 'Open the planner' : 'Create a free account'}
          </Link>
        </div>
        <div className="home-closing-dark" aria-hidden="true">
          <p className="closing-big">12</p>
          <p>seed recipes across 6 cuisines,<br />ready to cook today.</p>
        </div>
      </section>
    </main>
  );
}
