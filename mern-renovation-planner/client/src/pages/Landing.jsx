import { Link } from 'react-router-dom';
import MagneticButton from '../components/MagneticButton';
import FloorPlan from '../components/FloorPlan';

const SAMPLE_ROOMS = [
  { _id: 's1', name: 'Kitchen', type: 'Kitchen', length: 3.6, width: 3.0, height: 3, x: 0, y: 0, colour: '#FFD400' },
  { _id: 's2', name: 'Living Room', type: 'Living Room', length: 5.0, width: 4.0, height: 3, x: 3.6, y: 0, colour: '#2E6BFF' },
  { _id: 's3', name: 'Bathroom', type: 'Bathroom', length: 2.4, width: 1.8, height: 2.7, x: 0, y: 4.0, colour: '#00C2A8' },
];

const STEPS = [
  { n: '01', title: 'Measure', text: 'Enter each room with real dimensions in metres — length, width and height. HomeDraft computes floor area, wall area and volume for you, and draws the room on a blueprint canvas.' },
  { n: '02', title: 'Plan', text: 'Drag rooms around the floor plan, resize them by the corner handle, and lay out tasks by phase — Demolition through Finishing — with dependencies so nothing starts before its predecessor is done.' },
  { n: '03', title: 'Budget', text: 'The quantity take-off engine turns room dimensions into litres of paint, square feet of tile and bags of cement, priced from the materials catalogue. Estimated vs actual is tracked per category.' },
  { n: '04', title: 'Build', text: 'Assign contractors, collect quotes per task and watch the dashboard update live as work moves. Over-budget warnings appear before the money runs out, not after.' },
];

export default function Landing() {
  return (
    <div className="ink-bleed">
      <div className="split">
        <div className="split-sticky">
          <p className="kicker">Home renovation planner</p>
          <h1 className="hero-title">Measure. <span className="hl">Plan.</span> Budget. Build.</h1>
          <p style={{ fontSize: '1.1rem', maxWidth: '34rem' }}>
            HomeDraft turns a renovation from a pile of guesses into a plan you can draw, price and follow — room by room, task by task, rupee by rupee.
          </p>
          <div className="cta-row">
            <Link to="/register"><MagneticButton>Get started — free</MagneticButton></Link>
            <Link to="/login"><MagneticButton className="btn-blue">Sign in</MagneticButton></Link>
          </div>
          <div className="mini-plan" aria-label="Sample floor plan preview">
            <FloorPlan rooms={SAMPLE_ROOMS} readOnly onRoomChange={() => {}} />
          </div>
          <p style={{ fontSize: '0.85rem' }}>Sample floor plan — your rooms are drawn to scale on blueprint paper.</p>
        </div>
        <div className="split-scroll">
          <section>
            <p className="kicker">What it does</p>
            <h2 className="section-title">A plan you can stand on</h2>
            <div className="grid grid-2" style={{ marginTop: 20 }}>
              <div className="card wobble"><h3>📐 Floor-plan editor</h3><p>Drag rooms on a blueprint canvas. Dimension lines and areas update live as you move and resize.</p></div>
              <div className="card wobble"><h3>🧮 Quantity take-off</h3><p>Pick a room and a material — paint, tiles, flooring — and the server works out exactly how much you need, including waste.</p></div>
              <div className="card wobble"><h3>💰 Budget dashboard</h3><p>Estimated vs actual per category, remaining budget and over-budget warnings, drawn from your real tasks and take-offs.</p></div>
              <div className="card wobble"><h3>👷 Contractors &amp; quotes</h3><p>Keep a directory of trades, assign them to tasks and compare quotes side by side.</p></div>
            </div>
          </section>
          <section>
            <p className="kicker">How it works</p>
            <h2 className="section-title">Four steps, one plan</h2>
            <ol style={{ fontSize: '1.05rem', lineHeight: 1.7 }}>
              <li><strong>Measure</strong> — add rooms with real dimensions.</li>
              <li><strong>Plan</strong> — lay out the floor plan and phase your tasks.</li>
              <li><strong>Budget</strong> — run take-offs and watch the numbers add up.</li>
              <li><strong>Build</strong> — track work live with contractors and quotes.</li>
            </ol>
          </section>
          <section>
            <p className="kicker">Sample budget</p>
            <h2 className="section-title">What a kitchen remodel looks like</h2>
            <p>Sample project figures, shown as an illustration — your own numbers will come from your rooms, tasks and take-offs.</p>
            <div className="stat-strip" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className="stat"><b>₹4,50,000</b>Total budget</div>
              <div className="stat"><b>5</b>Phases planned</div>
              <div className="stat"><b>2</b>Take-off lines</div>
            </div>
            <p>Sign in with a demo account to open the sample projects and try the floor-plan editor yourself.</p>
          </section>
        </div>
      </div>

      {STEPS.map((s) => (
        <section key={s.n} className="story-slide">
          <div className="container">
            <div className="story-num">{s.n}</div>
            <p className="kicker">Step {s.n}</p>
            <h2 className="section-title">{s.title}</h2>
            <p style={{ fontSize: '1.15rem', maxWidth: '36rem' }}>{s.text}</p>
          </div>
        </section>
      ))}
    </div>
  );
}
