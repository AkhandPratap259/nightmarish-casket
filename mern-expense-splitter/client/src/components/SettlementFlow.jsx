import { formatMoney } from '../api';

// The simplified settlement plan as an animated money-flow diagram: each
// transfer is a row that slides in in sequence, From → To with the amount.
export default function SettlementFlow({ plan, beforeCount, currency, onSettle }) {
  const rows = Array.isArray(plan) ? plan : [];
  const afterCount = rows.length;

  if (!rows.length) {
    return <p className="muted">Everyone is settled up — no transfers needed.</p>;
  }

  return (
    <div className="settlement-flow">
      <p className="settlement-compare" role="status">
        <strong>{afterCount} transfer{afterCount === 1 ? '' : 's'}</strong> instead of{' '}
        <strong>{beforeCount}</strong> — FairShare nets out the debts first.
      </p>
      <ol className="settlement-rows">
        {rows.map((step, i) => {
          const from = step.fromName || step.from || step.payer || 'Someone';
          const to = step.toName || step.to || step.payee || 'Someone';
          const amount = step.amount ?? step.value ?? 0;
          return (
            <li
              key={`${from}-${to}-${i}`}
              className="settlement-row"
              style={{ animationDelay: `${i * 180}ms` }}
            >
              <span className="settlement-index">{String(i + 1).padStart(2, '0')}</span>
              <span className="settlement-party">{from}</span>
              <span className="settlement-arrow" aria-hidden="true">→</span>
              <span className="settlement-party">{to}</span>
              <strong className="settlement-amount">{formatMoney(amount, currency)}</strong>
              {onSettle && (
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => onSettle({ from, to, amount, fromId: step.fromId || step.from, toId: step.toId || step.to })}
                >
                  Record settlement
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
