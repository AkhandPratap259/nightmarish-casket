import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatINR } from '../api';
import { CATEGORIES, MATCH_FORMULA } from '../data/content';
import Reveal from '../components/Reveal';

export default function Home({ user }) {
  const [services, setServices] = useState([]);
  const [top, setTop] = useState([]);
  const [providers, setProviders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api
      .listServices()
      .then((d) => alive && setServices(d.services))
      .catch((err) => alive && setError(err.message));
    api
      .listOfferings({ sort: 'match' })
      .then((d) => alive && setTop(d.offerings.slice(0, 3)))
      .catch(() => {});
    api
      .listProviders()
      .then((d) => alive && setProviders(d.providers.slice(0, 4)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-left">
          <p className="section-label">(01) Local services, Azamgarh</p>
          <h1 className="hero-title" aria-label="Book trusted local services, ranked by a score you can see.">
            Book trusted local services, ranked by a <em>score you can see.</em>
          </h1>
          <p className="hero-sub">
            Cleaning, plumbing, electrical, repairs, salon and tutoring — from providers in your
            area, sorted by a transparent match score, with fixed slots and prices confirmed
            before you pay anything.
          </p>
          <div className="hero-ctas">
            <Link className="btn btn-primary" to="/browse">
              Browse services
            </Link>
            {!user && (
              <Link className="btn btn-ghost" to="/register?role=provider">
                Join as a provider
              </Link>
            )}
            {user?.role === 'provider' && (
              <Link className="btn btn-ghost" to="/provider">
                Open my dashboard
              </Link>
            )}
          </div>
          <p className="hero-note">No payment is taken in this demo — bookings are requests, not charges.</p>
        </div>
        <div className="hero-right">
          <p className="hero-right-label">Top matches right now</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <ul className="hero-top">
            {top.map((o, i) => (
              <li key={o._id} className="hero-top-row">
                <span className="hero-top-index">0{i + 1}</span>
                <span className="hero-top-service">
                  <strong>{o.service?.name}</strong>
                  <span className="muted">{o.provider?.name} · {formatINR(o.price)}</span>
                </span>
                <span className="hero-top-score">{o.matchScore}</span>
                <Link className="hero-top-link" to={`/offerings/${o._id}`}>
                  View
                </Link>
              </li>
            ))}
            {top.length === 0 && !error && <li className="muted">Loading top matches…</li>}
          </ul>
          <p className="hero-right-caption">
            Scores come from live ratings, completed jobs, response rate, price and area — never
            from paid placement.
          </p>
        </div>
      </section>

      <section className="section">
        <Reveal>
          <p className="section-label">(02) Services</p>
          <h2 className="section-title">
            What do you need <em>done today?</em>
          </h2>
        </Reveal>
        <div className="category-index">
          {CATEGORIES.map((cat, i) => {
            const count = services.filter((s) => s.category === cat).length;
            return (
              <Link key={cat} className="category-row" to={`/browse?category=${encodeURIComponent(cat)}`}>
                <span className="category-index-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="category-name">{cat}</span>
                <span className="muted">
                  {count} service{count === 1 ? '' : 's'}
                </span>
                <span className="category-arrow" aria-hidden="true">→</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section section-dark">
        <Reveal>
          <p className="section-label section-label--light">(03) How the match score works</p>
          <h2 className="section-title section-title--light">
            The ranking is <em>explained,</em> not hidden.
          </h2>
          <p className="section-sub section-sub--light">
            Every offering carries a 0–100 score built from five live inputs. The same breakdown
            appears on every card, so you can see exactly why one provider ranks above another.
          </p>
        </Reveal>
        <ol className="formula-list">
          {MATCH_FORMULA.map((item, i) => (
            <Reveal key={item.label} delay={i * 60}>
              <li className="formula-row">
                <span className="formula-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="formula-body">
                  <strong>{item.label}</strong>
                  <span>{item.text}</span>
                </span>
                <span className="formula-points">up to {item.points}</span>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="section">
        <Reveal>
          <p className="section-label">(04) Providers</p>
          <h2 className="section-title">
            People your neighbours <em>already trust.</em>
          </h2>
        </Reveal>
        <ul className="provider-strip">
          {providers.map((p) => (
            <li key={p._id} className="provider-card tilt">
              <span className="avatar" style={{ backgroundColor: p.avatarColor }} aria-hidden="true">
                {p.name.charAt(0)}
              </span>
              <strong>{p.name}</strong>
              <span className="muted">{p.city} · {p.yearsExperience} yrs experience</span>
              <span className="provider-stats">
                ★ {p.stats?.rating ?? '—'} ({p.stats?.reviewCount ?? 0} reviews) · {p.stats?.completedJobs ?? 0} jobs done
              </span>
              <Link className="btn btn-ghost btn-small" to={`/providers/${p._id}`}>
                View profile
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section section-cta">
        <Reveal>
          <p className="section-label">(05) How a booking works</p>
          <h2 className="section-title">
            Pick a slot. Get a <em>fixed price.</em> Track the job.
          </h2>
          <ol className="steps">
            <li><strong>01 — Compare</strong><span>Browse offerings ranked by match score and filter by your area.</span></li>
            <li><strong>02 — Book a slot</strong><span>Choose a date in the next 7 days and an hourly slot. Booked slots are disabled.</span></li>
            <li><strong>03 — Watch it move</strong><span>Requested → accepted → in progress → completed, with live updates.</span></li>
            <li><strong>04 — Review</strong><span>Rate the job once it is done. Your review moves the provider&apos;s score.</span></li>
          </ol>
          <Link className="btn btn-primary" to="/browse">
            Start browsing
          </Link>
        </Reveal>
      </section>
    </main>
  );
}
