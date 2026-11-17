import { formatINR } from '../data/config';

// Pledge amount slider: min = minimumPledge, max = goal (or goal * 1.2 when
// already overfunded). Marks show reward tiers; the preview names the
// highest tier the current amount unlocks.
export default function PledgeSlider({ amount, onChange, minimumPledge = 1, goal = 1, rewards = [] }) {
  const min = Math.max(1, Number(minimumPledge) || 1);
  const safeGoal = Math.max(min, Number(goal) || min);
  const max = safeGoal * 1.2;
  const sorted = [...(rewards || [])]
    .filter((r) => r && Number(r.amount) > 0)
    .sort((a, b) => Number(a.amount) - Number(b.amount));
  const unlocked = [...sorted].reverse().find((r) => Number(amount) >= Number(r.amount)) || null;

  return (
    <div className="pledge-slider-wrap">
      <div className="pledge-amount-row">
        <label htmlFor="pledge-amount">Pledge amount</label>
        <output htmlFor="pledge-amount" className="pledge-amount-value">
          {formatINR(amount)}
        </output>
      </div>
      <input
        id="pledge-amount"
        type="range"
        min={min}
        max={Math.round(max)}
        step={Math.max(1, Math.round(safeGoal / 100))}
        value={amount}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-describedby="pledge-preview"
      />
      <div className="slider-scale" aria-hidden="true">
        <span>{formatINR(min)}</span>
        <span>{formatINR(safeGoal)} goal</span>
        <span>{formatINR(Math.round(max))}</span>
      </div>
      {sorted.length ? (
        <div className="slider-marks" aria-hidden="true">
          {sorted.map((r) => (
            <span
              key={r._id || r.title}
              className={`slider-mark${Number(amount) >= Number(r.amount) ? ' is-unlocked' : ''}`}
              style={{ left: `${Math.min(100, Math.max(0, ((Number(r.amount) - min) / (max - min)) * 100))}%` }}
              title={`${r.title} — ${formatINR(r.amount)}`}
            />
          ))}
        </div>
      ) : null}
      <p id="pledge-preview" className="pledge-preview" aria-live="polite">
        {unlocked
          ? `Unlocks: ${unlocked.title} — ${formatINR(unlocked.amount)}${unlocked.description ? ` — ${unlocked.description}` : ''}`
          : sorted.length
            ? `Pledge ${formatINR(sorted[0].amount)} or more to unlock the first reward: ${sorted[0].title}.`
            : 'No reward tiers on this campaign — your pledge is a straight contribution.'}
      </p>
    </div>
  );
}
