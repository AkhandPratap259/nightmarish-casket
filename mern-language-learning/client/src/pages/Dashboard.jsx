import { useEffect, useState } from 'react';
import { api, xpIntoLevel } from '../api';
import { DAILY_GOAL_XP, ACHIEVEMENT_INFO } from '../data/config';
import Scramble from '../components/Scramble';
import XpRing from '../components/XpRing';

export default function Dashboard({ user, onGo, onRequireAuth }) {
  const [week, setWeek] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [continueLesson, setContinueLesson] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    api
      .myWeek()
      .then((d) => setWeek(d.days))
      .catch((err) => setError(err.message));
    api
      .languages()
      .then(async (d) => {
        setLanguages(d.languages);
        for (const lang of d.languages) {
          if (lang.completedCount < lang.lessonCount) {
            const det = await api.language(lang.code);
            const next = det.units
              .flatMap((u) => u.lessons)
              .find((l) => l.status !== 'completed');
            if (next) {
              setContinueLesson({ ...next, languageCode: lang.code, languageName: lang.name });
              break;
            }
          }
        }
      })
      .catch((err) => setError(err.message));
  }, [user]);

  if (!user) {
    return (
      <div className="page">
        <p className="section-label">(DASHBOARD)</p>
        <h1>
          Your progress, <em>at a glance.</em>
        </h1>
        <p>Sign in to see your XP, streak, level and weekly chart.</p>
        <button type="button" className="btn btn-primary" onClick={onRequireAuth}>
          Sign in
        </button>
      </div>
    );
  }

  const { level, into, needed } = xpIntoLevel(user.xp);
  const maxWeek = Math.max(1, ...week.map((d) => d.xp));
  const dailyRatio = Math.min(1, user.dailyXp / DAILY_GOAL_XP);

  return (
    <div className="page dashboard-page">
      <p className="section-label">(DASHBOARD) {user.name.toUpperCase()}</p>
      <h1>
        {user.streak > 0 ? (
          <>
            <svg className="streak-flame" width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"
                fill="#ffb000"
              />
            </svg>{' '}
            {user.streak}-day streak. <em><Scramble text="Keep it burning." /></em>
          </>
        ) : (
          <>
            Start today. <em><Scramble text="Earn your first flame." /></em>
          </>
        )}
      </h1>

      {error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : null}

      <section className="dash-split" aria-label="Today">
        <div className="dash-panel">
          <p className="section-label">(TODAY)</p>
          <div className="dash-rings">
            <XpRing value={user.dailyXp} max={DAILY_GOAL_XP} label="XP today" sublabel={`goal ${DAILY_GOAL_XP} XP`} />
            <div className="dash-level">
              <p className="dash-level-num">Level {level}</p>
              <p className="dash-level-sub">
                {into} / {needed} XP to level {level + 1}
              </p>
              <div className="level-bar" role="progressbar" aria-valuenow={into} aria-valuemin={0} aria-valuemax={needed} aria-label="Progress to next level">
                <span style={{ width: `${(into / needed) * 100}%` }} />
              </div>
              <p className="dash-level-sub">{user.xp} XP total · {user.lessonsCompleted} lesson{user.lessonsCompleted === 1 ? '' : 's'} complete</p>
            </div>
          </div>
        </div>
        <div className="dash-panel dash-panel-sun">
          <p className="section-label section-label-light">(CONTINUE LEARNING)</p>
          {continueLesson ? (
            <>
              <h2>
                {continueLesson.languageName}: <em>{continueLesson.title}</em>
              </h2>
              <p>
                Unit {continueLesson.unit} · {continueLesson.exerciseCount} exercises · +{continueLesson.xpReward} XP
              </p>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => onGo({ name: 'lesson', id: continueLesson.id, language: continueLesson.languageCode })}
              >
                Continue →
              </button>
            </>
          ) : (
            <>
              <h2>
                All caught up. <em>Pick a new language.</em>
              </h2>
              <p>You have finished every seeded lesson. Instructors can add more from the instructor page.</p>
              <button type="button" className="btn btn-light" onClick={() => onGo({ name: 'home' })}>
                Browse languages
              </button>
            </>
          )}
        </div>
      </section>

      <section className="week-section" aria-labelledby="week-heading">
        <p className="section-label">(THIS WEEK)</p>
        <h2 id="week-heading">
          XP by day, <em>last 7 days.</em>
        </h2>
        <div className="week-chart" role="img" aria-label={`XP earned each day: ${week.map((d) => `${d.label} ${d.xp}`).join(', ')}`}>
          {week.map((d) => (
            <div key={d.date} className="week-bar-col">
              <span className="week-bar-value">{d.xp}</span>
              <div className="week-bar-track">
                <div className="week-bar-fill" style={{ height: `${(d.xp / maxWeek) * 100}%` }} />
              </div>
              <span className="week-bar-label">{d.label}</span>
            </div>
          ))}
        </div>
        <div className="daily-goal-line" aria-hidden="true">
          <span style={{ width: `${dailyRatio * 100}%` }} />
        </div>
        <p className="hint-text">Daily goal progress: {user.dailyXp} / {DAILY_GOAL_XP} XP today.</p>
        {week.length ? (
          <div className="week-orbit" role="img" aria-label={`Streak orbit: ${week.map((d) => `${d.label} ${d.xp} XP`).join(', ')}`}>
            <svg viewBox="0 0 560 150" aria-hidden="true">
              <ellipse cx="280" cy="105" rx="250" ry="72" fill="none" stroke="#45539a" strokeWidth="1.5" strokeDasharray="4 6" />
              {week.map((d, i) => {
                const angle = Math.PI * (1 - i / (week.length - 1 || 1));
                const x = 280 + 250 * Math.cos(angle);
                const y = 105 - 72 * Math.sin(angle);
                const active = d.xp > 0;
                return (
                  <g key={d.date} className="orbit-dot" style={{ animationDelay: `${i * 60}ms` }}>
                    <circle
                      cx={x}
                      cy={y}
                      r={active ? 11 : 7}
                      fill={active ? '#ff2e88' : '#141c46'}
                      stroke={active ? '#ffb000' : '#45539a'}
                      strokeWidth="2"
                    />
                    <text x={x} y={142} textAnchor="middle" fill="#a7aed6" fontSize="12" fontFamily="Work Sans, sans-serif">
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
            <p className="hint-text">Your week on its orbit — pink dots are days you earned XP.</p>
          </div>
        ) : null}
      </section>

      <section className="achievements-section" aria-labelledby="ach-heading">
        <p className="section-label">(BADGES)</p>
        <h2 id="ach-heading">
          Achievements, <em>earned on the server.</em>
        </h2>
        <ol className="ach-list">
          {Object.entries(ACHIEVEMENT_INFO).map(([key, info]) => {
            const earned = (user.achievements || []).find((a) => a.key === key);
            return (
              <li key={key} className={earned ? 'is-earned' : 'is-locked'}>
                <span className="ach-mark" aria-hidden="true">{earned ? '★' : '○'}</span>
                <span className="ach-text">
                  <strong>{earned ? earned.title : key.replace(/-/g, ' ')}</strong>
                  <span>{info}</span>
                </span>
                <span className="ach-state">{earned ? 'Earned' : 'Locked'}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
