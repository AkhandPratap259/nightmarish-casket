import { useEffect, useRef } from 'react';

/* Radial menu (D15) — a circular action menu for one card. Opens from the
   card's "⋯" button or a right-click. Moves call the same move endpoint as
   drag-and-drop, so WIP rejections surface the same way. Keyboard
   accessible: Escape closes and returns focus to the trigger button. */

const RADIUS = 84;
const ITEMS = [
  { key: 'open', label: 'Open details', icon: '◉', action: 'open' },
  { key: 'todo', label: 'Move to To Do', icon: '→', action: 'move' },
  { key: 'in-progress', label: 'Move to In Progress', icon: '→', action: 'move' },
  { key: 'review', label: 'Move to Review', icon: '→', action: 'move' },
  { key: 'done', label: 'Move to Done', icon: '→', action: 'move' },
];

export default function RadialMenu({ task, position, onOpen, onMove, onClose, triggerRef }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Tab'].includes(e.key)) {
        const items = [...(menuRef.current?.querySelectorAll('button') || [])];
        if (!items.length) return;
        const delta = (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.shiftKey) ? -1 : 1;
        e.preventDefault(); items[(items.indexOf(document.activeElement) + delta + items.length) % items.length].focus();
      }
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        triggerRef?.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    const first = menuRef.current?.querySelector('button');
    first?.focus();
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose, triggerRef]);

  const cx = Math.min(Math.max(position.x, 132), window.innerWidth - 132);
  const cy = Math.min(Math.max(position.y, 132), window.innerHeight - 132);

  return (
    <>
      <div className="radial-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="radial-menu"
        ref={menuRef}
        role="menu"
        aria-label={`Actions for ${task.title}`}
        style={{ left: cx, top: cy }}
      >
        <div className="radial-centre" aria-hidden="true">✦</div>
        {ITEMS.map((item, i) => {
          const angle = (-90 + (i * 360) / ITEMS.length) * (Math.PI / 180);
          const x = Math.cos(angle) * RADIUS;
          const y = Math.sin(angle) * RADIUS;
          return (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className="radial-item"
              aria-label={item.label}
              style={{ transform: `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px))` }}
              onClick={() => {
                if (item.action === 'open') onOpen(task);
                else onMove(task, item.key);
                onClose();
              }}
            >
              <span className="radial-icon" aria-hidden="true">{item.icon}</span>
              <span className="radial-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
