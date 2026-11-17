import { useEffect, useState } from 'react';
import { api } from '../api';
import { config, HOW_IT_WORKS, HOME_COPY, formatINR, categoryLabel, STATUS_LABELS } from '../data/config';
import FundingBar from '../components/FundingBar';
import CampaignArt from '../components/CampaignArt';

export default function Home({ user, onGo, onRequireAuth }) {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api
      .campaigns({ sort: 'most-funded', limit: 3, status: 'live' })
      .then((data) => {
        if (!alive) return;
        setFeatured(data.campaigns || []);
      })
      .catch((e) => {
        if (alive) setError(e.message || 'Could not load featured campaigns.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  function startCampaign() {
    if (user) onGo({ name: 'create' });
    else onRequireAuth();
  }

  // Illustrative thermometer: a sample campaign's progress, built in code.
  const sample = { title: 'Solar lanterns for village schools', pledged: 184000, goal: 250000, backers: 312 };
  const samplePct = Math.round((sample.pledged / sample.goal) * 100);

  return (
    <div className="home">
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-left">
          <p className="section-label">{HOME_COPY.heroEyebrow}</p>
          <h1 id="hero-heading">
            {HOME_COPY.heroHeadlineA} <em>{HOME_COPY.heroHeadlineEm}</em>
          </h1>
          <p className="hero-desc">{HOME_COPY.heroDescription}</p>
          <div className="hero-cta">
            <button type="button" className="btn btn-primary" onClick={() => onGo({ name: 'browse' })}>
              Browse campaigns
            </button>
            <button type="button" className="btn btn-dark" onClick={startCampaign}>
              Start a campaign
            </button>
          </div>
          <p className="hint-text">Mock payments only — no real money moves on {config.name}.</p>
        </div>
        <div className="hero-right" aria-label="Illustrative preview: funding thermometer">
          <p className="thermo-label">Illustrative preview</p>
          <div className="thermometer">
            <div className="thermo-track" aria-hidden="true">
              <div className="thermo-fill" style={{ height: `${samplePct}%` }} />
            </div>
            <div className="thermo-body">
              <p className="thermo-title">{sample.title}</p>
              <p className="thermo-big">{samplePct}%</p>
              <p className="thermo-sub">
                {formatINR(sample.pledged)} raised of {formatINR(sample.goal)} · {sample.backers} backers
              </p>
              <FundingBar pledged={sample.pledged} goal={sample.goal} showLabels={false} />
            </div>
          </div>
          <p className="thermo-note">Sample figures shown for illustration — live campaigns are listed below.</p>
        </div>
      </section>

      <section className="how" aria-labelledby="how-heading">
        <div className="section-head">
          <p className="section-label">How it works</p>
          <h2 id="how-heading">Three steps, <em>out in the open.</em></h2>
        </div>
        <ol className="ruled-list how-list">
          {HOW_IT_WORKS.map((step) => (
            <li key={step.n} className="ruled-row how-row">
              <span className="row-index" aria-hidden="true">{step.n}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="featured" aria-labelledby="featured-heading">
        <div className="section-head">
          <p className="section-label">Featured</p>
          <h2 id="featured-heading">Most funded <em>right now.</em></h2>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => onGo({ name: 'browse' })}>
            Browse all campaigns →
          </button>
        </div>
        {loading ? (
          <p className="empty-note">Loading featured campaigns…</p>
        ) : error ? (
          <p className="form-error" role="alert">{error}</p>
        ) : featured.length === 0 ? (
          <p className="empty-note">
            No live campaigns yet. Be the first to start one.
          </p>
        ) : (
          <ol className="ruled-list featured-list">
            {featured.map((c, i) => (
              <li key={c._id} className="ruled-row featured-row">
                <button type="button" className="featured-btn" onClick={() => onGo({ name: 'campaign', id: c._id })}>
                  <span className="row-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <CampaignArt title={c.title} category={c.category} size="small" />
                  <span className="featured-main">
                    <span className="featured-title">{c.title}</span>
                    <span className="featured-meta">
                      {categoryLabel(c.category)} · {STATUS_LABELS[c.status] || c.status} · {c.daysLeft ?? '—'} days left
                      {c.isSample ? ' · Sample campaign' : ''}
                    </span>
                    <FundingBar pledged={c.pledgedTotal} goal={c.goal} stretchGoals={c.stretchGoals} />
                  </span>
                  <span className="featured-figures">
                    <span className="featured-pledged">{formatINR(c.pledgedTotal)}</span>
                    <span className="featured-backers">{c.backerCount} backers</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="creators" aria-labelledby="creators-heading">
        <div className="creators-left">
          <p className="section-label section-label-light">For creators</p>
          <h2 id="creators-heading" className="light-heading">{HOME_COPY.creatorsTitle}</h2>
          <p className="creators-body">{HOME_COPY.creatorsBody}</p>
          <button type="button" className="btn btn-accent" onClick={startCampaign}>
            Start a campaign
          </button>
        </div>
        <ul className="creators-points">
          {HOME_COPY.creatorsPoints.map((point, i) => (
            <li key={point}>
              <span className="row-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              {point}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
