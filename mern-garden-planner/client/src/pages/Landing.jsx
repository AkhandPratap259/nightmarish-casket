import { Link } from 'react-router-dom';
import OrbitMap from '../components/OrbitMap';

// Illustrative orbit preview for visitors who are not signed in.
// Labelled as an illustration — the live map appears after sign-in.
const PREVIEW_BEDS = [
  { bed: { _id: 'p1', name: 'Bed A1', ring: 1, angle: 20, slots: 6 }, usedSlots: 6, harmony: 84, plantings: [{ plant: { colour: 'red', shape: 'circle' } }, { plant: { colour: 'green', shape: 'semicircle' } }, { plant: { colour: 'yellow', shape: 'circle' } }] },
  { bed: { _id: 'p2', name: 'Bed A2', ring: 1, angle: 140, slots: 6 }, usedSlots: 4, harmony: 72, plantings: [{ plant: { colour: 'yellow', shape: 'circle' } }, { plant: { colour: 'green', shape: 'triangle' } }] },
  { bed: { _id: 'p3', name: 'Bed A3', ring: 1, angle: 260, slots: 6 }, usedSlots: 0, harmony: null, plantings: [] },
  { bed: { _id: 'p4', name: 'Bed B1', ring: 2, angle: 80, slots: 8 }, usedSlots: 5, harmony: 91, plantings: [{ plant: { colour: 'green', shape: 'semicircle' } }, { plant: { colour: 'blue', shape: 'triangle' } }] },
  { bed: { _id: 'p5', name: 'Bed B2', ring: 2, angle: 200, slots: 8 }, usedSlots: 7, harmony: 68, plantings: [{ plant: { colour: 'green', shape: 'square' } }, { plant: { colour: 'red', shape: 'circle' } }] },
  { bed: { _id: 'p6', name: 'Bed B3', ring: 2, angle: 320, slots: 8 }, usedSlots: 2, harmony: 88, plantings: [{ plant: { colour: 'red', shape: 'square' } }] },
];

export default function Landing({ user }) {
  return (
    <div className="wrap page">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow red">Community garden planner</span>
          <h1 id="hero-title">
            <span className="misprint" data-text="Grow together,">Grow together,</span>
            <br />
            <span className="accent-red">in orbit.</span>
          </h1>
          <p className="lede">
            SproutPlot plans shared gardens as orbit rings of raised beds around a
            central compost hub. Throw a seed packet onto a bed and the
            companion-planting engine tells you straight away whether the neighbours
            will thrive together — or fight.
          </p>
          <div className="hero-cta">
            {user ? (
              <Link className="btn primary" to="/dashboard">Open my dashboard</Link>
            ) : (
              <>
                <Link className="btn primary" to="/register">Start a garden</Link>
                <Link className="btn" to="/login">Sign in</Link>
              </>
            )}
            <Link className="btn ghost" to="/plants">Browse the seed library</Link>
          </div>
          <div className="hero-stats" aria-label="What SproutPlot does">
            <div><b>16</b><span>plants in the library</span></div>
            <div><b>0–100</b><span>bed harmony score</span></div>
            <div><b>Live</b><span>watering &amp; harvest dates</span></div>
          </div>
        </div>
        <div>
          <OrbitMap beds={PREVIEW_BEDS} rings={2} onSelectBed={() => {}} />
          <p className="muted" style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: 10 }}>
            Illustrative preview — sign in to see your own garden&apos;s orbit map.
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="how-title">
        <span className="eyebrow blue">How it works</span>
        <h2 id="how-title">Three moves, one thriving bed</h2>
        <div className="grid cols-3" style={{ marginTop: 20 }}>
          <article className="card hoverable">
            <h3>1 · Throw a seed</h3>
            <p>Drag a Bauhaus seed packet from the library and throw it onto a bed on the orbit map. On touch, tap Sow instead — the same flow, no pointer needed.</p>
          </article>
          <article className="card hoverable">
            <h3>2 · Read the harmony</h3>
            <p>The companion engine scores the bed from 0 to 100. Antagonists are refused with the conflict named; companions lift the score.</p>
          </article>
          <article className="card hoverable">
            <h3>3 · Water &amp; harvest</h3>
            <p>Every planting gets a growth stage, a next-watering date and a harvest window — all computed from its real sowing date and the plant library.</p>
          </article>
        </div>
      </section>

      <section className="section" aria-labelledby="engine-title">
        <div className="card" style={{ background: 'var(--ink)', color: 'var(--white)', borderColor: 'var(--ink)' }}>
          <span className="eyebrow" style={{ background: 'var(--yellow)' }}>The standout</span>
          <h2 id="engine-title" style={{ color: 'var(--white)' }}>A companion-planting engine, not a list</h2>
          <p style={{ maxWidth: '62ch', color: '#e8e2d4' }}>
            Most garden apps store what you planted. SproutPlot checks whether it
            should be there at all: every sowing is validated against the bed&apos;s
            current neighbours using a companion / antagonist matrix, the bed&apos;s
            harmony score is recomputed live, and watering and harvest dates are
            derived from each plant&apos;s real needs — never typed in by hand.
          </p>
          <div style={{ marginTop: 18 }}>
            <Link className="btn" to="/plants">See the seed library</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
