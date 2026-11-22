import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';

// Command palette (Ctrl/Cmd+K): jump to any view or event by keyboard.
// Arrow keys move, Enter runs, Escape closes. Rendered through a portal
// on document.body so it is never hidden behind the sticky nav.
export default function CommandPalette({ open, onClose, go, user, onSignOut }) {
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocus.current = document.activeElement;
    setQuery('');
    setActive(0);
    api
      .events()
      .then((d) => setEvents(d.events || []))
      .catch(() => {});
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      if (previousFocus.current && previousFocus.current.focus) previousFocus.current.focus();
    };
  }, [open ]);

  const items = useMemo(() => {
    const actions = [
      { id: 'home', label: 'Go to home', hint: 'Home', run: () => go('home') },
      { id: 'events', label: 'Browse events', hint: 'All events', run: () => go('events') },
      ...(user?.role === 'attendee'
        ? [{ id: 'mine', label: 'My tickets', hint: 'Your bookings', run: () => go('mine') }]
        : []),
      ...(user?.role === 'organizer'
        ? [{ id: 'org', label: 'Organizer dashboard', hint: 'Your events', run: () => go('organizer') }]
        : []),
      ...(user?.role === 'admin'
        ? [{ id: 'admin', label: 'Admin analytics', hint: 'Platform numbers', run: () => go('admin') }]
        : []),
      ...(user
        ? [{ id: 'signout', label: 'Sign out', hint: user.name, run: onSignOut }]
        : [{ id: 'auth', label: 'Sign in', hint: 'Accounts', run: () => go('auth') }]),
    ];
    const q = query.trim().toLowerCase();
    const acts = q ? actions.filter((a) => a.label.toLowerCase().includes(q)) : actions;
    const evs = q
      ? events
          .filter((e) => `${e.title} ${e.city} ${e.venue}`.toLowerCase().includes(q))
          .slice(0, 6)
          .map((e) => ({
            id: `ev-${e.id}`,
            label: e.title,
            hint: `${e.city} · ${new Date(e.date).toLocaleDateString('en-IN')}`,
            run: () => go('event', e.id),
          }))
      : [];
    return [...acts, ...evs];
  }, [query, events, user, go, onSignOut]);

  useEffect(() => {
    setActive(0);
  }, [items.length]);

  if (!open) return null;

  const runItem = (item) => {
    if (!item) return;
    onClose();
    item.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runItem(items[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return createPortal(
    <div
      className="palette-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label="Quick actions">
        <input
          ref={inputRef}
          className="palette-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Jump to an event, a page, an action…"
          aria-label="Search actions and events"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={items[active] ? `palette-${items[active].id}` : undefined}
        />
        {items.length === 0 ? (
          <p className="palette-empty">No match — try an event title, a city or a page name.</p>
        ) : (
          <ul className="palette-list" id="palette-list" role="listbox" aria-label="Results">
            {items.map((item, i) => (
              <li key={item.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  id={`palette-${item.id}`}
                  className={`palette-item ${i === active ? 'active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => runItem(item)}
                >
                  <span>{item.label}</span>
                  <small>{item.hint}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="palette-hint">↑ ↓ to move · Enter to open · Esc to close · Ctrl/⌘ K to toggle</p>
      </div>
    </div>,
    document.body
  );
}
