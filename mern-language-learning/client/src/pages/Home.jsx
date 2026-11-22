import { useEffect, useState } from 'react';
import { api } from '../api';
import { config, DAILY_GOAL_XP } from '../data/config';
import Scramble from '../components/Scramble';

export default function Home({ user, onGo, onRequireAuth }) {
  const [languages, setLanguages] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .languages()
      .then((d) => setLanguages(d.languages))
      .catch((err) => setError(err.message));
  }, []);

  function startLanguage(code) {
    if (!user) {
      onRequireAuth();
      return;
    }
    onGo({ name: 'learn', language: code });
  }

  return (
    <div className="home">
      <section className="hero-split" aria-labelledby="home-heading">
        <div className="hero-scene" aria-hidden="true">
          <svg className="hero-sun" viewBox="0 0 400 400">
            <defs>
              <linearGradient id="heroSunGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffe95e" />
                <stop offset="0.55" stopColor="#ff7a18" />
                <stop offset="1" stopColor="#ff2e88" />
              </linearGradient>
              <clipPath id="heroSunClip"><circle cx="200" cy="200" r="150" /></clipPath>
            </defs>
            <circle cx="200" cy="200" r="150" fill="url(#heroSunGrad)" />
            <g fill="#0a0e27" clipPath="url(#heroSunClip)">
              <rect x="30" y="212" width="340" height="7" />
              <rect x="30" y="238" width="340" height="11" />
              <rect x="30" y="270" width="340" height="15" />
              <rect x="30" y="308" width="340" height="21" />
              <rect x="30" y="352" width="340" height="28" />
            </g>
          </svg>
          <div className="grid-floor" />
        </div>
        <div className="hero-left">
          <p className="section-label">(01) GAMIFIED LANGUAGE LEARNING</p>
          <h1 id="home-heading">
            <Scramble text="Learn a language, " />
            <em>
              <Scramble text="one small win" />
            </em>{' '}
            <Scramble text="at a time." />
          </h1>
          <p className="hero-sub">
            Short lessons with hearts, XP and streaks — in Spanish, French, German and Japanese.
            Words you get wrong come back for spaced review, so they stick.
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => (user ? onGo({ name: 'learn', language: 'es' }) : onRequireAuth())}
            >
              Start learning
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => onGo({ name: 'leaderboard' })}>
              See the leaderboard
            </button>
          </div>
          <p className="hero-note">Daily goal: {DAILY_GOAL_XP} XP · 3 hearts per lesson · free to play, sample content</p>
        </div>
        <div className="hero-right">
          <p className="section-label section-label-light">(02) PICK A LANGUAGE</p>
          {error ? (
            <p className="form-error" role="alert">{error}</p>
          ) : null}
          <ol className="lang-list">
            {languages.map((lang, i) => (
              <li key={lang.code}>
                <button type="button" className="lang-row" onClick={() => startLanguage(lang.code)}>
                  <span className="lang-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span className="lang-names">
                    <span className="lang-name">{lang.name}</span>
                    <span className="lang-native">{lang.nativeName}</span>
                  </span>
                  <span className="lang-meta">
                    {lang.lessonCount} lessons · {lang.difficulty}
                    {user && lang.completedCount ? ` · ${lang.completedCount} done` : ''}
                  </span>
                  <span className="lang-arrow" aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="hero-right-note">{languages.length ? languages[0].tagline : ''}</p>
        </div>
      </section>

      <section className="how-section" aria-labelledby="how-heading">
        <p className="section-label">(03) HOW IT WORKS</p>
        <h2 id="how-heading">
          Play a lesson. <em>Keep the streak.</em>
        </h2>
        <ol className="how-rows">
          <li>
            <span className="how-num" aria-hidden="true">01</span>
            <div>
              <h3>Pick a language, open the skill tree</h3>
              <p>Lessons unlock in order. Finish one to open the next — no skipping ahead.</p>
            </div>
          </li>
          <li>
            <span className="how-num" aria-hidden="true">02</span>
            <div>
              <h3>Answer with 3 hearts on the line</h3>
              <p>Multiple choice, fill-in-the-blank, matching pairs and real listening practice with your browser’s speech. Every correct answer earns XP.</p>
            </div>
          </li>
          <li>
            <span className="how-num" aria-hidden="true">03</span>
            <div>
              <h3>Review what you missed</h3>
              <p>Wrong words enter a spaced-repetition deck: right answers push them further out, wrong ones bring them back tomorrow.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="demo-section" aria-labelledby="demo-heading">
        <p className="section-label">(04) TRY IT NOW</p>
        <h2 id="demo-heading">
          Demo accounts, <em>ready to sign in.</em>
        </h2>
        <p>
          Learner <strong>{config.demoEmail}</strong> · Instructor <strong>{config.demoInstructorEmail}</strong> · Admin{' '}
          <strong>{config.demoAdminEmail}</strong> — all with password <strong>{config.demoPassword}</strong>.
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={onRequireAuth}>
            Sign in
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onGo({ name: 'dashboard' })}>
            My dashboard
          </button>
        </div>
      </section>
    </div>
  );
}
