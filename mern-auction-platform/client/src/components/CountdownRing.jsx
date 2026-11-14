import { useEffect, useState } from 'react';
import { timeLeft } from '../api';

// SVG countdown ring: the ring drains as the lot's remaining time runs out,
// and the centre shows the live HH:MM:SS countdown. Ticks every second.
export default function CountdownRing({ endsAt, startsAt, size = 148 }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const end = new Date(endsAt).getTime();
  const start = startsAt ? new Date(startsAt).getTime() : end - 24 * 60 * 60 * 1000;
  const total = Math.max(1, end - start);
  const remaining = Math.max(0, end - now);
  const fraction = remaining / total;
  const left = timeLeft(endsAt, now);

  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const urgent = remaining > 0 && remaining <= 5 * 60 * 1000;

  return (
    <div className={`countdown-ring ${urgent ? 'is-urgent' : ''}`} role="timer" aria-label={left ? `${left} remaining` : 'Auction ended'}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="ring-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="ring-value"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          strokeLinecap="butt"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-centre">
        <span className="ring-time">{left || 'Ended'}</span>
        <span className="ring-label">{left ? 'remaining' : 'closed'}</span>
      </div>
    </div>
  );
}
