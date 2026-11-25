import { useEffect, useRef } from 'react';

export default function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  const prevFocus = useRef(document.activeElement);

  useEffect(() => {
    const el = ref.current;
    el?.focus();
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && el) {
        const focusables = el.querySelectorAll('button, input, select, textarea, a[href]');
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prevFocus.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close dialog">✕</button>
        </div>
        <div style={{ marginTop: 16 }}>{children}</div>
      </div>
    </div>
  );
}
