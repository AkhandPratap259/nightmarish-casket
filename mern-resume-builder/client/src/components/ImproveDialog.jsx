import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Accessible dialog rendered through a portal on document.body, so it is
// never hidden behind the sticky nav. Traps focus, closes on Escape and
// backdrop click, and returns focus to the opener (handled by App).
export default function ImproveDialog({ dialog, engineLabel, onApply, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    el.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab') {
        const focusables = el.querySelectorAll('button, [href], textarea, input, [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="improve-heading"
        ref={dialogRef}
        tabIndex={-1}
      >
        <h2 id="improve-heading">Improve this bullet</h2>
        <p className="engine-label">{engineLabel}</p>
        <div className="compare">
          <div>
            <h3>Original</h3>
            <p>{dialog.original || '(empty bullet)'}</p>
          </div>
          <div>
            <h3>Improved</h3>
            <p>{dialog.improved}</p>
          </div>
        </div>
        {dialog.notes && dialog.notes.length > 0 && (
          <ul className="dialog-notes">
            {dialog.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
        <div className="dialog-actions">
          <button className="btn btn-primary" type="button" onClick={onApply}>
            Apply improvement
          </button>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Keep original
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
