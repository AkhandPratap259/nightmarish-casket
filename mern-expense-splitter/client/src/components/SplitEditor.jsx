import { useEffect, useMemo } from 'react';
import { SPLIT_TYPES } from '../data/content';
import { formatMoney } from '../api';

// Interactive split editor for the Add Expense dialog. The caller keeps
// `splitType` and `values` (an object keyed by member id) in state; this
// component renders the inputs, validates live, and reports the computed
// split payload plus validity back through onValidityChange.
export default function SplitEditor({
  members,
  amount,
  currency,
  splitType,
  values,
  onTypeChange,
  onValuesChange,
  onValidityChange,
}) {
  const total = Number(amount) || 0;

  const computed = useMemo(() => {
    const included = members.filter((m) => m.included !== false);
    if (!included.length || total <= 0) return { valid: false, payload: [], message: '' };
    if (splitType === 'equal') {
      const each = Math.round((total / included.length) * 100) / 100;
      return {
        valid: true,
        payload: included.map((m) => ({ user: m.id, amount: each })),
        message: `Each person pays ${formatMoney(each, currency)}.`,
      };
    }
    if (splitType === 'exact') {
      const sum = included.reduce((s, m) => s + (Number(values[m.id]) || 0), 0);
      const diff = Math.round((total - sum) * 100) / 100;
      return {
        valid: Math.abs(diff) < 0.01,
        payload: included.map((m) => ({ user: m.id, amount: Number(values[m.id]) || 0 })),
        message:
          Math.abs(diff) < 0.01
            ? `Exact split adds up to ${formatMoney(total, currency)}.`
            : `${formatMoney(Math.abs(diff), currency)} ${diff > 0 ? 'still to assign' : 'over the total'}.`,
      };
    }
    if (splitType === 'percentage') {
      const sum = included.reduce((s, m) => s + (Number(values[m.id]) || 0), 0);
      const diff = Math.round((100 - sum) * 100) / 100;
      return {
        valid: Math.abs(diff) < 0.01,
        payload: included.map((m) => ({ user: m.id, percentage: Number(values[m.id]) || 0 })),
        message:
          Math.abs(diff) < 0.01
            ? 'Percentages add up to 100%.'
            : `${Math.abs(diff)}% ${diff > 0 ? 'still to assign' : 'over 100%'}.`,
      };
    }
    // shares
    const totalShares = included.reduce((s, m) => s + (Number(values[m.id]) || 0), 0);
    const valid = totalShares > 0 && included.every((m) => (Number(values[m.id]) || 0) > 0);
    return {
      valid,
      payload: included.map((m) => ({ user: m.id, shares: Number(values[m.id]) || 0 })),
      message: valid
        ? `Each share is worth ${formatMoney(total / totalShares, currency)}.`
        : 'Give every person at least 1 share.',
    };
  }, [members, total, splitType, values, currency]);

  useEffect(() => {
    if (onValidityChange) onValidityChange(computed.valid, computed.payload);
  }, [computed, onValidityChange]);

  function setValue(id, raw) {
    onValuesChange({ ...values, [id]: raw });
  }

  function defaultFor(id) {
    if (splitType === 'percentage') return values[id] ?? '';
    if (splitType === 'shares') return values[id] ?? 1;
    return values[id] ?? '';
  }

  return (
    <fieldset className="split-editor">
      <legend>How is it split?</legend>
      <div className="split-type-row" role="group" aria-label="Split type">
        {SPLIT_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`chip ${splitType === t.value ? 'chip--active' : ''}`}
            aria-pressed={splitType === t.value}
            onClick={() => onTypeChange(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="muted small">
        {SPLIT_TYPES.find((t) => t.value === splitType)?.hint}
      </p>

      {splitType !== 'equal' && (
        <ul className="split-rows">
          {members.map((m) => (
            <li key={m.id} className="split-row">
              <span className="split-name">{m.name}</span>
              <label className="split-input-label">
                <span className="sr-only">
                  {splitType === 'exact'
                    ? `Amount for ${m.name}`
                    : splitType === 'percentage'
                      ? `Percentage for ${m.name}`
                      : `Shares for ${m.name}`}
                </span>
                <input
                  type="number"
                  min="0"
                  step={splitType === 'exact' ? '0.01' : '1'}
                  value={defaultFor(m.id)}
                  onChange={(e) => setValue(m.id, e.target.value)}
                  aria-label={`${splitType} share for ${m.name}`}
                />
              </label>
              <span className="split-unit" aria-hidden="true">
                {splitType === 'exact' ? currency : splitType === 'percentage' ? '%' : 'shares'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {splitType === 'equal' && (
        <ul className="split-rows">
          {members.map((m) => (
            <li key={m.id} className="split-row split-row--equal">
              <span className="split-name">{m.name}</span>
              <strong>
                {total > 0 ? formatMoney(total / members.length, currency) : '—'}
              </strong>
            </li>
          ))}
        </ul>
      )}

      <p
        className={`split-readout ${computed.valid ? 'split-readout--ok' : 'split-readout--error'}`}
        role="status"
        aria-live="polite"
      >
        {total <= 0
          ? 'Enter an amount above to see the split.'
          : computed.message}
      </p>
    </fieldset>
  );
}
