import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Dialog rendered through a portal on document.body so it is never hidden
// behind the sticky nav. Focus trap, Escape/backdrop close, focus return.
export default function Dialog({ open, onClose, label, children, wide }) {
  const panelRef = useRef(null);
  const openerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    const panel = panelRef.current;
    const focusables = () => (panel ? [...panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled) : []);
    const first = focusables()[0];
    if (first) first.focus();
    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab') {
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
      }
    }
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
    <div className="dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={label} className={`dialog-panel${wide ? ' dialog-panel--wide' : ''}`}>
        {children}
      </div>
    </div>,
    document.body
  );
}
