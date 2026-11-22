import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';
import PinnedStory from '../components/PinnedStory';
import { DEMO_SPLIT, HOW_IT_WORKS } from '../data/content';

const STORY_STEPS = [
  {
    num: '01',
    title: 'The bill lands',
    text: 'One person pays and logs the expense once — title, amount, category, and who paid. The receipt goes on the record for the whole group to see.',
  },
  {
    num: '02',
    title: 'Shares worked out',
    text: 'Split it equally, by exact amounts, by percentage, or by shares. Everyone sees their share live, the moment the expense is added.',
  },
  {
    num: '03',
    title: 'Debts cancel out',
    text: 'FairShare nets every expense in the group, cancelling debts that run both ways. Five tangled debts shrink before anyone pays a rupee.',
  },
  {
    num: '04',
    title: 'Two payments settle it',
    text: 'What is left is the shortest settlement plan — two transfers instead of five. Everyone sees the same balances, live.',
  },
];

const dateline = new Date().toLocaleDateString('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default function Home({ user }) {
  return (
    <main className="page">
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-kicker">
          <span>
            <strong>EXTRA · EXTRA</strong> — The FairShare Ledger
          </span>
          <span>{dateline}</span>
          <span>Vol. 1 · The Settlement Edition</span>
        </div>
        <div className="hero-grid">
          <div className="hero-left">
            <p className="section-label">(01) Group expenses, settled fairly</p>
            <h1 className="hero-title" id="hero-heading" aria-label="Split the bill. Keep the friendship.">
              Split the bill. <em>Keep the friendship.</em>
            </h1>
            <p className="hero-sub hero-sub--columns">
              FairShare logs a shared expense once, splits it the way your group agrees —
              equally, exactly, by percentage or by shares — and works out the fewest
              transfers that settle everyone. No card, no fees — demo data is illustrative.
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
            <p className="hero-note">STOP PRESS — settlements now take fewer transfers than debts.</p>
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
            <div className="hero-illustration" aria-hidden="true">
              <svg viewBox="0 0 320 150">
                <defs>
                  <pattern id="hero-halftone" width="9" height="9" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.2" fill="rgba(255,176,0,0.35)" />
                  </pattern>
                </defs>
                <rect x="8" y="8" width="304" height="134" fill="url(#hero-halftone)" />
                <rect x="40" y="30" width="170" height="96" fill="#f2ecdc" stroke="#17130c" strokeWidth="2" />
                <path d="M40 126 l12 -8 12 8 12 -8 12 8 12 -8 12 8 12 -8 12 8 12 -8 12 8 12 -8 12 8 12 -8 12 8 12 -8 12 8" fill="none" stroke="#17130c" strokeWidth="2" />
                <text x="125" y="56" textAnchor="middle" fill="#17130c" fontSize="13" fontFamily="'IBM Plex Mono', monospace" fontWeight="600">THE BILL</text>
                <line x1="56" y1="66" x2="194" y2="66" stroke="#17130c" strokeWidth="1" />
                <text x="56" y="88" fill="#6d6350" fontSize="11" fontFamily="'IBM Plex Mono', monospace">DINNER · FUEL · STAY</text>
                <text x="56" y="110" fill="#c8102e" fontSize="13" fontFamily="'IBM Plex Mono', monospace" fontWeight="600">TOTAL ₹3,450</text>
                <circle cx="248" cy="48" r="26" fill="none" stroke="#ffb000" strokeWidth="2" />
                <text x="248" y="52" textAnchor="middle" fill="#ffb000" fontSize="12" fontFamily="'IBM Plex Mono', monospace" fontWeight="600">5 → 2</text>
                <text x="248" y="88" textAnchor="middle" fill="#ffb000" fontSize="9" fontFamily="'IBM Plex Mono', monospace">TRANSFERS</text>
                <line x1="210" y1="100" x2="280" y2="100" stroke="#ffb000" strokeWidth="2" />
                <text x="245" y="118" textAnchor="middle" fill="#cfc6ae" fontSize="10" fontFamily="'IBM Plex Mono', monospace">SETTLED</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="pinned-story" aria-labelledby="story-heading">
        <Reveal>
          <p className="section-label">(03) The settlement story</p>
          <h2 className="section-title" id="story-heading">
            Follow one bill from <em>chaos to settled</em>
          </h2>
          <p className="section-sub">
            Scroll — the story pins to the page while the settlement unfolds, step by
            step. {DEMO_SPLIT.label}.
          </p>
        </Reveal>
        <PinnedStory steps={STORY_STEPS} before={DEMO_SPLIT.before} after={DEMO_SPLIT.after} />
      </section>

      <section className="section" aria-labelledby="how-heading">
        <Reveal>
          <p className="section-label">(04) How it works</p>
          <h2 className="section-title" id="how-heading">
            Three steps to <em>settled</em>
          </h2>
        </Reveal>
        <ol className="how-list">
          {HOW_IT_WORKS.map((step) => (
            <li key={step.num} className="how-row tilt">
              <span className="how-num" aria-hidden="true">{step.num}</span>
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
          <p className="section-label">(05) Debt simplification, shown</p>
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
          <p className="section-label">(06) Split your way</p>
          <h2 className="section-title" id="split-heading">
            One expense, <em>four</em> ways to split it
          </h2>
        </Reveal>
        <ul className="split-ways">
          <li className="tilt">
            <strong>Equal</strong>
            <span>Everyone pays the same share. The default for dinners and trips.</span>
          </li>
          <li className="tilt">
            <strong>Exact amounts</strong>
            <span>Enter what each person owes in money — for when orders differ.</span>
          </li>
          <li className="tilt">
            <strong>Percentage</strong>
            <span>Split by agreed percentages. The editor checks they add up to 100%.</span>
          </li>
          <li className="tilt">
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
