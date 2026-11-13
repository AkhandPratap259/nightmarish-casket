import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Accessible dialog rendered through a portal on document.body so it is
// never hidden behind the sticky nav. Focus trap, Escape/backdrop close,
// focus return to the element that opened it.
export default function Dialog({ title, onClose, children, labelledBy }) {
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    previousFocus.current = document.activeElement;
    const dialog = dialogRef.current;
    const focusables = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length) focusables[0].focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(
        dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter((el) => !el.disabled);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previousFocus.current && previousFocus.current.focus) previousFocus.current.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={labelledBy || 'dialog-title'} ref={dialogRef}>
        <button type="button" className="dialog-close" onClick={onClose} aria-label="Close dialog">
          ✕
        </button>
        {title ? (
          <h2 id="dialog-title" style={{ fontSize: '1.6rem', marginBottom: 8, paddingRight: 48 }}>
            {title}
          </h2>
        ) : null}
        {children}
      </div>
    </div>,
    document.body
  );
}
