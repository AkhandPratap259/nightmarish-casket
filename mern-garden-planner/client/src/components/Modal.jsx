import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Dialog rendered through a portal on document.body: never hidden behind the
// sticky nav. Focus trap, Escape/backdrop close, focus return on close.
export default function Modal({ open, onClose, title, children, labelledBy }) {
  const dialogRef = useRef(null);
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    lastFocusedRef.current = document.activeElement;
    const dialog = dialogRef.current;
    const focusables = () =>
      Array.from(dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(
        (el) => !el.disabled && el.offsetParent !== null
      );
    const first = focusables()[0];
    if (first) first.focus();

    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab') {
        const items = focusables();
        if (items.length === 0) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey, true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = '';
      if (lastFocusedRef.current && lastFocusedRef.current.focus) lastFocusedRef.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={dialogRef}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close dialog">✕</button>
        {title ? <h2 id={labelledBy} style={{ marginBottom: 16, paddingRight: 48 }}>{title}</h2> : null}
        {children}
      </div>
    </div>,
    document.body
  );
}
