import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Reveal from '../components/Reveal';
import CountUp from '../components/CountUp';
import { HOW_IT_WORKS } from '../data/content';

export default function Home({ user }) {
  const [stats, setStats] = useState(null);
  const [topRated, setTopRated] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.stats().then(setStats).catch(() => setError('Stats are unavailable right now.'));
    api.listRecipes({ sort: 'top-rated', limit: 4 }).then((d) => setTopRated(d.recipes || [])).catch(() => {});
  }, []);

  return (
    <main className="page home-page">
      <section className="hero" aria-labelledby="home-title">
        <div className="hero-left">
          <p className="section-label">(01) — Recipe sharing &amp; meal planning</p>
          <h1 id="home-title" aria-label="Cook what you love. Plan the week. Shop once.">
            Cook what you <em>love.</em><br />Plan the week.<br />Shop once.
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
          <p className="muted small">Seed recipes are demo data. No payment, no sign-up wall to browse.</p>
        </div>
        <div className="hero-right" aria-label="Illustrative preview of a week plan">
          <p className="hero-right-label">This week, on the plan</p>
          <ol className="hero-plan">
            <li><span>Mon</span><strong>Chole Masala</strong><em>dinner · 4 servings</em></li>
            <li><span>Tue</span><strong>Paneer Butter Masala</strong><em>dinner · 4 servings</em></li>
            <li><span>Wed</span><strong>Veg Hakka Noodles</strong><em>lunch · 3 servings</em></li>
            <li><span>Thu</span><strong>Thai Green Curry</strong><em>dinner · 4 servings</em></li>
          </ol>
          <p className="small muted">Illustrative preview — sample plan shown in the design, not a live account.</p>
        </div>
      </section>

      <section className="stats-strip" aria-label="FlavorForge at a glance">
        <div className="stat-row">
          <div className="stat">
            <span className="stat-num"><CountUp value={stats ? stats.totalRecipes : 0} /></span>
            <span className="stat-label">Recipes in the library</span>
          </div>
          <div className="stat">
            <span className="stat-num"><CountUp value={stats ? stats.cuisines : 0} /></span>
            <span className="stat-label">Cuisines to explore</span>
          </div>
          <div className="stat">
            <span className="stat-num"><CountUp value={stats ? stats.timesCooked : 0} /></span>
            <span className="stat-label">Times recipes cooked</span>
          </div>
        </div>
        {error && <p className="muted small" role="status">{error}</p>}
      </section>

      <section className="home-featured" aria-labelledby="featured-title">
        <Reveal>
          <p className="section-label">(02) — Top rated</p>
          <h2 id="featured-title">Loved by the <em>cooks</em> who tried them</h2>
        </Reveal>
        <ol className="ruled-list featured-list">
          {topRated.map((r, i) => (
            <li key={r._id} className="ruled-row">
              <span className="ruled-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div className="ruled-main">
                <Link className="ruled-title" to={`/recipes/${r._id}`}>{r.title}</Link>
                <p className="muted small">{r.cuisine} · {r.category} · {r.prepTimeMin + r.cookTimeMin} min total</p>
              </div>
              <span className="ruled-meta">★ {(r.ratingAvg || 0).toFixed(1)} · {r.ratingCount || 0} reviews</span>
            </li>
          ))}
        </ol>
        <Link className="btn btn-ghost" to="/browse">See all recipes →</Link>
      </section>

      <section className="home-how" aria-labelledby="how-title">
        <Reveal>
          <p className="section-label">(03) — How it works</p>
          <h2 id="how-title">From craving to <em>cooked</em> in three moves</h2>
        </Reveal>
        <div className="how-grid">
          {HOW_IT_WORKS.map((s) => (
            <Reveal key={s.num} className="how-step">
              <p className="how-num">{s.num}</p>
              <h3>{s.title}</h3>
              <p className="muted">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="home-closing" aria-labelledby="closing-title">
        <div className="home-closing-text">
          <p className="section-label">(04) — Start cooking</p>
          <h2 id="closing-title">Your week deserves a <em>better</em> plan than “what’s in the fridge?”</h2>
          <p className="muted">Pick a recipe, scale it to your table, drop it on the planner — the list writes itself.</p>
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
