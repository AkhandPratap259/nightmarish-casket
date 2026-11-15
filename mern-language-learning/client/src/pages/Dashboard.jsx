import { useEffect, useState } from 'react';
import { api, xpIntoLevel } from '../api';
import { DAILY_GOAL_XP, ACHIEVEMENT_INFO } from '../data/config';
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
            <span className="streak-flame" aria-hidden="true">🔥</span> {user.streak}-day streak. <em>Keep it burning.</em>
          </>
        ) : (
          <>
            Start today. <em>Earn your first flame.</em>
          </>
        )}
      </h1>

      {error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : null}

      <section className="dash-split" aria-label="Today">
        <div className="dash-ivory">
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
        <div className="dash-dark">
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
                <span className="ach-mark" aria-hidden="true">{earned ? '🏅' : '○'}</span>
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
