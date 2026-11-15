import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Accessible dialog rendered through a portal on document.body so it is
// never hidden behind the sticky nav. Focus trap, Escape/backdrop close,
// focus return to the element that opened it.
//
// onClose is read through a ref so the effect runs once per mount: an
// inline onClose prop changes identity on every parent render (the lot
// page ticks every second), and re-running this effect would steal focus
// out of the dialog and reset the stored opener.
export default function Dialog({ title, onClose, children, labelledBy }) {
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);
  const restoreTimer = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    // Cancel a restore scheduled by a previous effect cleanup (React
    // StrictMode mounts, unmounts and remounts in development; the
    // simulated unmount must not yank focus back out of the dialog).
    if (restoreTimer.current) {
      window.clearTimeout(restoreTimer.current);
      restoreTimer.current = null;
    }
    // Only record the opener when focus is outside the dialog. On a
    // StrictMode remount focus is already on the dialog's close button —
    // recording it would make focus return try to focus a removed element.
    if (dialogRef.current && dialogRef.current.contains(document.activeElement)) {
      // Keep the previously recorded opener.
    } else {
      previousFocus.current = document.activeElement;
    }
    const dialog = dialogRef.current;
    const focusables = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length) focusables[0].focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
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
      // Restore focus on the next tick: when the dialog unmounts while a
      // mouse click is in progress, the browser moves focus to <body> after
      // the focused element inside the dialog is removed — a synchronous
      // focus() here would be overwritten by that step.
      const prev = previousFocus.current;
      restoreTimer.current = window.setTimeout(() => {
        restoreTimer.current = null;
        if (prev && prev.focus) prev.focus();
      }, 0);
    };
  }, []);

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
