import { useEffect, useRef, useState } from 'react';

// D4: Scroll-pinned storytelling. The left panel sticks while the reader
// scrolls the story steps on the right; the pinned panel swaps its headline,
// copy and diagram to the step currently in view. On narrow screens the
// panel unpins and the steps stack in order. Steps use the illustrative
// DEMO_SPLIT figures (labelled as sample data in the section copy).
function StepViz({ step, before, after }) {
  if (step === 0) {
    // The bill lands: a torn receipt with halftone.
    return (
      <svg viewBox="0 0 320 120" role="img" aria-label="A receipt for the shared bill">
        <rect x="70" y="8" width="180" height="104" fill="#f2ecdc" stroke="#17130c" strokeWidth="2" />
        <path d="M70 112 l12 -8 12 8 12 -8 12 8 12 -8 12 8 12 -8 12 8 12 -8 12 8 12 -8 12 8 12 -8 12 8 12 -8 12 8" fill="none" stroke="#17130c" strokeWidth="2" />
        <text x="160" y="36" textAnchor="middle" fill="#17130c" fontSize="13" fontFamily="'IBM Plex Mono', monospace" fontWeight="600">THE BILL</text>
        <line x1="86" y1="48" x2="234" y2="48" stroke="#17130c" strokeWidth="1" />
        <text x="86" y="70" fill="#6d6350" fontSize="12" fontFamily="'IBM Plex Mono', monospace">DINNER · FUEL · STAY</text>
        <text x="86" y="92" fill="#c8102e" fontSize="14" fontFamily="'IBM Plex Mono', monospace" fontWeight="600">TOTAL ₹3,450</text>
        <circle cx="292" cy="26" r="18" fill="none" stroke="#ffb000" strokeWidth="2" />
        <text x="292" y="31" textAnchor="middle" fill="#ffb000" fontSize="14" fontFamily="'IBM Plex Mono', monospace">!</text>
      </svg>
    );
  }
  if (step === 1) {
    // Shares worked out: four-way split bars.
    return (
      <svg viewBox="0 0 320 120" role="img" aria-label="The bill split four ways">
        {['Asha 25%', 'Ravi 25%', 'Meera 25%', 'Dev 25%'].map((label, i) => (
          <g key={label}>
            <text x="8" y={24 + i * 26} fill="#cfc6ae" fontSize="12" fontFamily="'IBM Plex Mono', monospace">{label}</text>
            <rect x="110" y={12 + i * 26} width="180" height="14" fill="none" stroke="#6b6350" strokeWidth="1" />
            <rect x="110" y={12 + i * 26} width="180" height="14" fill="#ffb000" />
          </g>
        ))}
      </svg>
    );
  }
  if (step === 2) {
    // Debts cancel out: tangled arrows struck through.
    return (
      <svg viewBox="0 0 320 120" role="img" aria-label="Tangled debts cancelling each other out">
        {before.map((d, i) => {
          const y = 22 + i * 18;
          return (
            <g key={i} opacity={0.85}>
              <line x1="20" y1={y} x2="250" y2={y} stroke="#8a7f68" strokeWidth="1.5" strokeDasharray="4 3" />
              <text x="20" y={y - 4} fill="#cfc6ae" fontSize="11" fontFamily="'IBM Plex Mono', monospace">{`${d.from} → ${d.to} ₹${d.amount}`}</text>
            </g>
          );
        })}
        <line x1="10" y1="8" x2="310" y2="112" stroke="#c8102e" strokeWidth="3" />
        <text x="160" y="112" textAnchor="middle" fill="#ffb000" fontSize="12" fontFamily="'IBM Plex Mono', monospace" fontWeight="600">CANCELLED BOTH WAYS</text>
      </svg>
    );
  }
  // Two payments settle it.
  return (
    <svg viewBox="0 0 320 120" role="img" aria-label="Two final transfers settle the group">
      {after.map((d, i) => {
        const y = 34 + i * 40;
        return (
          <g key={i}>
            <rect x="10" y={y - 13} width="86" height="26" fill="#f2ecdc" stroke="#17130c" strokeWidth="2" />
            <text x="53" y={y + 4} textAnchor="middle" fill="#17130c" fontSize="12" fontFamily="'IBM Plex Mono', monospace" fontWeight="600">{d.from}</text>
            <line x1="96" y1={y} x2="214" y2={y} stroke="#ffb000" strokeWidth="2.5" markerEnd="url(#story-arrow)" />
            <rect x="224" y={y - 13} width="86" height="26" fill="#c8102e" stroke="#17130c" strokeWidth="2" />
            <text x="267" y={y + 4} textAnchor="middle" fill="#fff" fontSize="12" fontFamily="'IBM Plex Mono', monospace" fontWeight="600">{d.to}</text>
            <text x="155" y={y - 18} textAnchor="middle" fill="#ffb000" fontSize="12" fontFamily="'IBM Plex Mono', monospace" fontWeight="600">₹{d.amount}</text>
          </g>
        );
      })}
      <defs>
        <marker id="story-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#ffb000" />
        </marker>
      </defs>
    </svg>
  );
}

export default function PinnedStory({ steps, before, after }) {
  const [active, setActive] = useState(0);
  const [swapping, setSwapping] = useState(false);
  const stepRefs = useRef([]);

  useEffect(() => {
    const els = stepRefs.current.filter(Boolean);
    if (!els.length) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.dataset.index);
            setActive((prev) => (prev === idx ? prev : idx));
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [steps.length]);

  // Slow cinematic swap: fade the panel content out, then in on the new step.
  useEffect(() => {
    setSwapping(true);
    const t = window.setTimeout(() => setSwapping(false), 260);
    return () => window.clearTimeout(t);
  }, [active]);

  const current = steps[active];

  return (
    <div className="pinned-story-inner">
      <div className="pinned-panel" aria-live="polite">
        <p className="pinned-panel-kicker">The settlement story · {String(active + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</p>
        <div className={swapping ? 'pinned-panel-title--swap' : ''}>
          <h3 className="pinned-panel-title">{current.title}</h3>
          <p className="pinned-panel-text">{current.text}</p>
        </div>
        <div className="pinned-panel-viz">
          <StepViz step={active} before={before} after={after} />
        </div>
        <div className="pinned-progress" aria-hidden="true">
          {steps.map((s, i) => (
            <span key={s.num} className={i <= active ? 'on' : ''} />
          ))}
        </div>
      </div>
      <ol className="pinned-steps">
        {steps.map((s, i) => (
          <li
            key={s.num}
            ref={(el) => { stepRefs.current[i] = el; }}
            data-index={i}
            className={`pinned-step ${i === active ? 'on' : ''}`}
          >
            <span className="pinned-step-num">STEP {s.num}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
