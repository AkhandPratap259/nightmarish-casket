import { useEffect, useState } from 'react';
import { HOME_COPY, config } from '../data/config.js';
import { getSocket } from '../socket.js';
import { formatKg, formatDuration } from '../api.js';
import Marquee from '../components/Marquee.jsx';

function useLiveFeed() {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    const socket = getSocket(null);
    const onSession = (payload) => {
      setEvents((prev) => [payload, ...prev].slice(0, 5));
    };
    socket.on('session:completed', onSession);
    return () => socket.off('session:completed', onSession);
  }, []);
  return events;
}

const STORY_SLIDES = [
  { id: 'slide-top', label: 'Start' },
  { id: 'slide-how', label: 'How it works' },
  { id: 'slide-library', label: 'The library' },
  { id: 'slide-trainers', label: 'For trainers' },
];

export default function Home({ user, go }) {
  const live = useLiveFeed();
  const marqueeItems = [
    'Live volume ring',
    'Rest timer',
    'Personal records',
    'Weekly volume',
    '28 exercises',
    'Week streaks',
    ...live.map(
      (e) => `${e.userName} finished ${e.sessionName} — ${formatKg(e.totalVolume)}`
    ),
  ];
  return (
    <div className="story">
      <section className="hero story-slide story-slide--pink" id="slide-top">
        <div className="hero-left">
          <p className="eyebrow">{HOME_COPY.heroEyebrow}</p>
          <h1 aria-label="Train with a plan, see the progress.">
            <span className="h-line">{HOME_COPY.heroHeadlineA}</span>{' '}
            <span className="h-line">
              <em>{HOME_COPY.heroHeadlineEm}</em>
            </span>
          </h1>
          <p className="hero-desc">{HOME_COPY.heroDescription}</p>
          <div className="hero-ctas">
            {user ? (
              <>
                <button type="button" className="btn btn--primary" onClick={() => go('dashboard')}>
                  Open my dashboard
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => go('templates')}>
                  Build a template
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn--primary" onClick={() => go('auth')}>
                  Start training — sign in
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => go('exercises')}>
                  Browse the exercise library
                </button>
              </>
            )}
          </div>
          <p className="hero-note">
            Demo member: {config.demoMemberEmail} · password {config.demoPassword}
          </p>
        </div>
        <div className="hero-right" aria-label="Live training feed preview">
          <p className="hero-right-label">Live · completed sessions</p>
          {live.length === 0 ? (
            <div className="live-feed-empty">
              <p className="live-feed-empty-title">The feed lights up when a session finishes.</p>
              <p>
                Finish a workout in a live session and it appears here in real time, with the
                total volume and duration from the session itself.
              </p>
            </div>
          ) : (
            <ul className="live-feed">
              {live.map((e, i) => (
                <li key={`${e.finishedAt}-${i}`} className="live-feed-item">
                  <strong>{e.userName}</strong> finished <em>{e.sessionName}</em>
                  <span>
                    {formatKg(e.totalVolume)} · {formatDuration(e.durationSeconds)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="hero-right-caption">
            Illustrative preview — the feed shows real sessions completed while you watch.
          </p>
        </div>
        <nav className="story-dots" aria-label="Story slides">
          {STORY_SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="story-dot"
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              aria-label={`Go to slide ${i + 1}: ${s.label}`}
            >
              <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span> {s.label}
            </button>
          ))}
        </nav>
      </section>

      <Marquee items={marqueeItems} label="What PulseFit tracks" />

      <section className="section story-slide story-slide--butter" id="slide-how">
        <p className="section-label">(01) {HOME_COPY.howTitle}</p>
        <h2 className="section-title">
          Three steps, <em>every session.</em>
        </h2>
        <p className="section-body">Swipe or scroll sideways through the steps — each one is a card in the rail.</p>
        <ol className="how-list rail">
          {HOME_COPY.howSteps.map((step) => (
            <li key={step.n} className="how-item rail-item">
              <span className="how-num">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section section--dark story-slide story-slide--dark" id="slide-library">
        <p className="section-label section-label--light">(02) The library</p>
        <h2 className="section-title section-title--light">
          Twenty-eight exercises, <em>one honest library.</em>
        </h2>
        <p className="section-body section-body--light">
          Every exercise carries its muscle group, equipment and difficulty — and nothing else.
          No invented ratings, no stock photos, no fake testimonials. Add your own custom
          exercises when the library does not have what you train.
        </p>
        <button type="button" className="btn btn--accent" onClick={() => go('exercises')}>
          Open the library
        </button>
      </section>

      <section className="section story-slide story-slide--mint" id="slide-trainers">
        <p className="section-label">(03) For trainers</p>
        <h2 className="section-title">
          Plans and challenges, <em>built for members.</em>
        </h2>
        <p className="section-body">
          Trainers write multi-week plans from real templates and assign them to members.
          Challenges — sessions, total volume, or training days — track themselves from the
          sessions members actually complete.
        </p>
        <button type="button" className="btn btn--dark" onClick={() => go('challenges')}>
          See challenges
        </button>
      </section>
    </div>
  );
}
