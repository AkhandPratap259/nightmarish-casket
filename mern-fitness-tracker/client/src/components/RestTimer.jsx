import { useEffect, useRef, useState } from 'react';

// Rest timer for live sessions. Counts down from a chosen rest length,
// beeps (Web Audio, short and quiet) at zero, and keeps counting up in
// overtime so the lifter can see how long they have rested.
const PRESETS = [60, 90, 120, 180];

export default function RestTimer() {
  const [preset, setPreset] = useState(90);
  const [remaining, setRemaining] = useState(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
      setTimeout(() => ctx.close(), 400);
    } catch {
      // Audio is a nice-to-have; silence must never break the timer.
    }
  }

  function start() {
    clearInterval(timerRef.current);
    setRemaining(preset);
    setDone(false);
    setRunning(true);
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = (prev ?? 0) - 1;
        if (next === 0) {
          beep();
          setDone(true);
        }
        return next;
      });
    }, 1000);
  }

  function stop() {
    clearInterval(timerRef.current);
    setRunning(false);
    setRemaining(null);
    setDone(false);
  }

  function format(seconds) {
    const abs = Math.abs(seconds);
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    const sign = seconds < 0 ? '+' : '';
    return `${sign}${m}:${String(s).padStart(2, '0')}`;
  }

  return (
    <section className="rest-timer" aria-label="Rest timer">
      <div className="rest-timer-head">
        <h3>Rest timer</h3>
        <span className="rest-timer-state" aria-live="polite">
          {remaining === null ? 'Ready' : done ? 'Rest over — go!' : running ? 'Resting' : 'Paused'}
        </span>
      </div>
      <div className={`rest-timer-time ${done ? 'rest-timer-time--done' : ''}`} aria-live="off">
        {remaining === null ? format(preset) : format(remaining)}
      </div>
      <div className="rest-presets" role="group" aria-label="Rest length">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className={preset === p ? 'chip chip--active' : 'chip'}
            onClick={() => {
              setPreset(p);
              if (remaining === null) setRemaining(null);
            }}
            disabled={running}
            aria-pressed={preset === p}
          >
            {p}s
          </button>
        ))}
      </div>
      <div className="rest-actions">
        {!running ? (
          <button type="button" className="btn btn--primary" onClick={start}>
            Start rest
          </button>
        ) : (
          <button type="button" className="btn btn--dark" onClick={stop}>
            Stop timer
          </button>
        )}
      </div>
    </section>
  );
}
