import { useEffect, useState } from 'react';
import { formatMoney } from '../api';

// One member's net balance as an animated horizontal bar. Positive net means
// the member is owed money ("gets back"); negative means they owe.
export default function BalanceBar({ name, net, maxAbs, currency }) {
  const [width, setWidth] = useState(0);
  const pct = maxAbs > 0 ? Math.min(100, (Math.abs(net) / maxAbs) * 100) : 0;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  const getsBack = net > 0.005;
  const settled = Math.abs(net) < 0.01;

  return (
    <div className="balance-bar-row">
      <div className="balance-bar-head">
        <span className="balance-bar-name">{name}</span>
        <span className={`balance-bar-value ${getsBack ? 'balance-bar-value--positive' : settled ? '' : 'balance-bar-value--negative'}`}>
          {settled ? 'Settled up' : `${getsBack ? 'gets back' : 'owes'} ${formatMoney(Math.abs(net), currency)}`}
        </span>
      </div>
      <div
        className="balance-bar-track"
        role="img"
        aria-label={`${name} ${settled ? 'is settled up' : `${getsBack ? 'gets back' : 'owes'} ${formatMoney(Math.abs(net), currency)}`}`}
      >
        <div
          className={`balance-bar-fill ${getsBack ? 'balance-bar-fill--positive' : 'balance-bar-fill--negative'}`}
          style={{ width: `${settled ? 0 : width}%` }}
        />
      </div>
    </div>
  );
}
