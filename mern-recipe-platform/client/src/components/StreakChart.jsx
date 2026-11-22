import { useEffect, useState } from 'react';
import { api } from '../api';

// Data-driven visual from the real analytics endpoint: weekly cooking streak
// (dots for the last 12 weeks, filled = streak length), cuisine distribution
// bars and the most-cooked list. Bars animate with the playful-bounce ease
// whenever the data changes. Signed-in users only — the endpoint needs auth.
export default function StreakChart() {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getAnalytics()
      .then((d) => { setData(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <section className="panel rhythm-panel" aria-label="Your cooking rhythm">
        <p role="status">Loading your cooking rhythm…</p>
      </section>
    );
  }
  if (!data) return null;

  const streak = Number(data.weeklyStreak) || 0;
  const dots = Array.from({ length: 12 }, (_, i) => i < Math.min(streak, 12));
  const cuisineMax = Math.max(1, ...(data.cuisineDistribution || []).map((c) => c.count));
  const cookedMax = Math.max(1, ...(data.mostCooked || []).map((r) => r.timesCooked));

  return (
    <section className="panel rhythm-panel" aria-labelledby="rhythm-title">
      <p className="section-label">Your kitchen, this week</p>
      <h2 id="rhythm-title">Your cooking <em>rhythm</em></h2>
      <div className="rhythm-grid">
        <div>
          <h3 className="section-title-small">Weekly streak — {streak} {streak === 1 ? 'week' : 'weeks'}</h3>
          <div className="streak-dots" role="img" aria-label={`Cooking streak: ${streak} consecutive weeks with at least one planned meal`}>
            {dots.map((on, i) => (
              <span key={i} className={`streak-dot ${on ? 'streak-dot--on' : ''}`} />
            ))}
          </div>
          <p className="muted small">
            {data.streakDefinition || 'Consecutive weeks (counting back from this week) with at least one planned meal.'}
            {' '}You have {data.plansThisWeek || 0} {data.plansThisWeek === 1 ? 'meal' : 'meals'} planned this week.
          </p>
          <h3 className="section-title-small" style={{ marginTop: 24 }}>Most cooked</h3>
          <ul className="cooked-list">
            {(data.mostCooked || []).slice(0, 5).map((r) => (
              <li key={r.id}>
                <span>{r.title} <span className="muted small">· {r.cuisine}</span></span>
                <span className="bar-value">{r.timesCooked}×</span>
              </li>
            ))}
            {(data.mostCooked || []).length === 0 && <li className="muted">Nothing cooked yet — start a Cook Mode session.</li>}
          </ul>
        </div>
        <div>
          <h3 className="section-title-small">Cuisines in your library</h3>
          <ul className="bar-chart">
            {(data.cuisineDistribution || []).map((c, i) => (
              <li key={c.cuisine} className="bar-row">
                <span className="bar-label">{c.cuisine}</span>
                <span className="bar-track" aria-hidden="true">
                  <span
                    className={`bar-fill ${i % 3 === 1 ? 'bar-fill--tomato' : i % 3 === 2 ? 'bar-fill--honey' : ''}`}
                    style={{ width: `${Math.round((c.count / cuisineMax) * 100)}%` }}
                  />
                </span>
                <span className="bar-value">{c.count}</span>
              </li>
            ))}
            {(data.cuisineDistribution || []).length === 0 && <li className="muted">No cuisines yet.</li>}
          </ul>
          <h3 className="section-title-small" style={{ marginTop: 24 }}>Top rated</h3>
          <ul className="bar-chart">
            {(data.topRated || []).slice(0, 5).map((r) => (
              <li key={r.id} className="bar-row">
                <span className="bar-label">{r.title}</span>
                <span className="bar-track" aria-hidden="true">
                  <span
                    className="bar-fill bar-fill--tomato"
                    style={{ width: `${Math.round(((r.ratingAvg || 0) / 5) * 100)}%` }}
                  />
                </span>
                <span className="bar-value">★ {(r.ratingAvg || 0).toFixed(1)}</span>
              </li>
            ))}
            {(data.topRated || []).length === 0 && <li className="muted">No rated recipes yet.</li>}
          </ul>
          <p className="muted small" style={{ marginTop: 16 }}>
            {data.myRecipes || 0} {data.myRecipes === 1 ? 'recipe' : 'recipes'} authored by you · {data.totalRecipes || 0} in the library.
            {cookedMax > 0 && ` Most-cooked recipe: ${cookedMax}×.`}
          </p>
        </div>
      </div>
    </section>
  );
}
