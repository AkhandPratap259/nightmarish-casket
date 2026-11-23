import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialog from './Dialog';
import { api } from '../api';

// Command palette (Ctrl/⌘+K): jump to pages, search leagues, create a league.
// Keyboard-first: arrows move, Enter runs, Escape closes, focus returns.
export default function CommandPalette({ open, onClose, user }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [leagues, setLeagues] = useState([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setActive(0);
    api.listLeagues({}).then((d) => setLeagues(d.leagues || [])).catch(() => setLeagues([]));
    const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
    return () => clearTimeout(t);
  }, [open ]);

  const actions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = [
      { id: 'home', label: 'Go to home', hint: 'Home', run: () => navigate('/') },
      { id: 'leagues', label: 'Browse all leagues', hint: 'Leagues', run: () => navigate('/leagues') },
      { id: 'create', label: 'Start a new league', hint: 'Create', run: () => navigate('/leagues/new') },
      { id: 'dashboard', label: 'Open my dashboard', hint: 'Dashboard', run: () => navigate('/dashboard') },
    ];
    if (user && user.role === 'admin') {
      base.push({ id: 'admin', label: 'Open admin overview', hint: 'Admin', run: () => navigate('/admin') });
    }
    const leagueActions = leagues
      .filter((l) => !q || l.name.toLowerCase().includes(q) || l.city.toLowerCase().includes(q) || l.sport.toLowerCase().includes(q))
      .slice(0, 6)
      .map((l) => ({ id: `league-${l.id}`, label: `${l.name} — ${l.sport} · ${l.city}`, hint: 'League', run: () => navigate(`/leagues/${l.id}`) }));
    const filteredBase = base.filter((a) => !q || a.label.toLowerCase().includes(q));
    return [...filteredBase, ...leagueActions];
  }, [query, leagues, navigate, user]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, actions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const action = actions[active];
      if (action) {
        onClose();
        action.run();
      }
    }
  }

  useEffect(() => {
    const el = listRef.current && listRef.current.children[active];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <Dialog open={open} onClose={onClose} label="Command palette" wide>
      <div className="palette" onKeyDown={onKeyDown}>
        <div className="palette__row">
          <span className="palette__key" aria-hidden="true">⌘K</span>
          <input
            ref={inputRef}
            className="palette__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search leagues…"
            aria-label="Search commands and leagues"
          />
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Esc</button>
        </div>
        <ul className="palette__list" ref={listRef} role="listbox" aria-label="Commands">
          {actions.length === 0 && <li className="palette__empty">No matches. Try “leagues” or a team city.</li>}
          {actions.map((a, i) => (
            <li key={a.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={`palette__item${i === active ? ' palette__item--active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => { onClose(); a.run(); }}
              >
                <span>{a.label}</span>
                <span className="palette__hint">{a.hint}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="palette__foot">↑↓ to move · Enter to run · Esc to close</p>
      </div>
    </Dialog>
  );
}
