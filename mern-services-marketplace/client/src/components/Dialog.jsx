import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Accessible dialog rendered through a portal on document.body so it is
// never hidden behind the sticky nav. Focus is trapped inside, Escape and
// backdrop clicks close it, and focus returns to the opener.
export default function Dialog({ open, onClose, title, children, labelledBy }) {
  const panelRef = useRef(null);
  const openerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    const panel = panelRef.current;
    const focusables = () =>
      panel
        ? [...panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
            (el) => !el.disabled && el.offsetParent !== null
          )
        : [];
    const first = focusables()[0];
    if (first) first.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = '';
      if (openerRef.current && openerRef.current.focus) openerRef.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy || title}
      >
        <div className="dialog-head">
          <h2 className="dialog-title">{title}</h2>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
