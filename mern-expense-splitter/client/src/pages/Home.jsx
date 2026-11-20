import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';
import { DEMO_SPLIT, HOW_IT_WORKS } from '../data/content';

export default function Home({ user }) {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero-left">
          <p className="section-label">(01) Group expenses, settled fairly</p>
          <h1 className="hero-title">
            Split the bill. <em>Keep the friendship.</em>
          </h1>
          <p className="hero-sub">
            FairShare logs a shared expense once, splits it the way your group agrees —
            equally, exactly, by percentage or by shares — and works out the fewest
            transfers that settle everyone.
          </p>
          <div className="hero-ctas">
            {user ? (
              <>
                <Link className="btn btn-primary" to="/dashboard">Open my dashboard</Link>
                <Link className="btn btn-ghost" to="/groups">My groups</Link>
              </>
            ) : (
              <>
                <Link className="btn btn-primary" to="/register">Start splitting free</Link>
                <Link className="btn btn-ghost" to="/login">Try the demo account</Link>
              </>
            )}
          </div>
          <p className="hero-note">No card, no fees — demo data is illustrative.</p>
        </div>
        <div className="hero-right">
          <p className="hero-right-label">(02) Why fewer transfers matter</p>
          <p className="hero-right-big">
            Five tangled debts between three friends become <em>two payments</em>.
          </p>
          <p className="hero-right-caption">
            FairShare nets every expense in a group, cancels debts that run both ways,
            and hands you the shortest settlement plan.
          </p>
          <p className="hero-right-caption">
            Everyone sees the same balances, live, the moment an expense is added.
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="how-heading">
        <Reveal>
          <p className="section-label">(03) How it works</p>
          <h2 className="section-title" id="how-heading">
            Three steps to <em>settled</em>
          </h2>
        </Reveal>
        <ol className="how-list">
          {HOW_IT_WORKS.map((step) => (
            <li key={step.num} className="how-row">
              <span className="how-num">{step.num}</span>
              <div className="how-body">
                <strong>{step.title}</strong>
                <span>{step.text}</span>
              </div>
              <span className="how-arrow" aria-hidden="true">→</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="section section-dark" aria-labelledby="demo-heading">
        <Reveal>
          <p className="section-label">(04) Debt simplification, shown</p>
          <h2 className="section-title section-title--light" id="demo-heading">
            From five debts to <em>two payments</em>
          </h2>
          <p className="section-sub section-sub--light">{DEMO_SPLIT.label}</p>
        </Reveal>
        <div className="demo-split">
          <div className="demo-split-col">
            <h3 className="demo-split-title">Before — everyone owes everyone</h3>
            <ul className="demo-split-list">
              {DEMO_SPLIT.before.map((d, i) => (
                <li key={i}>
                  <span>{d.from}</span>
                  <span aria-hidden="true">→</span>
                  <span>{d.to}</span>
                  <strong>₹{d.amount.toLocaleString('en-IN')}</strong>
                </li>
              ))}
            </ul>
          </div>
          <div className="demo-split-arrow" aria-hidden="true">→</div>
          <div className="demo-split-col demo-split-col--after">
            <h3 className="demo-split-title">After — the simplified plan</h3>
            <ul className="demo-split-list">
              {DEMO_SPLIT.after.map((d, i) => (
                <li key={i}>
                  <span>{d.from}</span>
                  <span aria-hidden="true">→</span>
                  <span>{d.to}</span>
                  <strong>₹{d.amount.toLocaleString('en-IN')}</strong>
                </li>
              ))}
            </ul>
            <p className="demo-split-note">2 transfers instead of 5.</p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="split-heading">
        <Reveal>
          <p className="section-label">(05) Split your way</p>
          <h2 className="section-title" id="split-heading">
            One expense, <em>four</em> ways to split it
          </h2>
        </Reveal>
        <ul className="split-ways">
          <li>
            <strong>Equal</strong>
            <span>Everyone pays the same share. The default for dinners and trips.</span>
          </li>
          <li>
            <strong>Exact amounts</strong>
            <span>Enter what each person owes in money — for when orders differ.</span>
          </li>
          <li>
            <strong>Percentage</strong>
            <span>Split by agreed percentages. The editor checks they add up to 100%.</span>
          </li>
          <li>
            <strong>Shares</strong>
            <span>Weight by shares — two shares for the couple, one for everyone else.</span>
          </li>
        </ul>
        <div className="section-cta">
          {user ? (
            <Link className="btn btn-primary" to="/groups">Go to my groups</Link>
          ) : (
            <Link className="btn btn-primary" to="/register">Create your first group</Link>
          )}
        </div>
      </section>
    </main>
  );
}
