import { useEffect, useState } from 'react';
import { api, formatKg } from '../api.js';
import VolumeChart from '../components/VolumeChart.jsx';
import MuscleSplit from '../components/MuscleSplit.jsx';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api
      .analytics()
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p className="page-error" role="alert">{error}</p>;
  if (!data) return <p className="page-loading">Loading analytics…</p>;

  const { totals, streak, weeks, muscleSplit } = data;
  const bestWeek = weeks.reduce((best, w) => (w.volume > (best?.volume || 0) ? w : best), null);

  return (
    <section className="section">
      <p className="section-label">(07) Analytics</p>
      <h1 className="section-title">
        The numbers, <em>from your sessions.</em>
      </h1>
      <p className="section-body">
        Every figure below is computed from your own completed sessions. A week with no
        sessions shows as zero — nothing is filled in for you.
      </p>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-num">{totals.totalSessions}</span>
          <span className="stat-label">Sessions</span>
        </div>
        <div className="stat">
          <span className="stat-num">{formatKg(totals.totalVolume)}</span>
          <span className="stat-label">Lifetime volume</span>
        </div>
        <div className="stat">
          <span className="stat-num">{totals.totalMinutes}</span>
          <span className="stat-label">Minutes trained</span>
        </div>
        <div className="stat">
          <span className="stat-num">{streak}</span>
          <span className="stat-label">Week streak</span>
        </div>
      </div>

      <div className="analytics-split">
        <div>
          <h2>Weekly volume — last 8 weeks</h2>
          <VolumeChart weeks={weeks} />
          {bestWeek && bestWeek.volume > 0 && (
            <p className="muted">
              Biggest week: {formatKg(bestWeek.volume)} in the week of{' '}
              {new Date(`${bestWeek.weekStart}T00:00:00`).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
              })}
              .
            </p>
          )}
        </div>
        <div>
          <h2>Where the sets go</h2>
          <MuscleSplit split={muscleSplit} />
        </div>
      </div>
    </section>
  );
}
