import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, addDaysStr, dayLabel, weekStartStr } from '../api';
import GroceryVisual from '../components/GroceryVisual';

export default function Grocery({ user }) {
  const [weekStart, setWeekStart] = useState(() => weekStartStr());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const weekEnd = addDaysStr(weekStart, 6);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getGrocery(weekStart, weekEnd);
      setItems(data.items || []);
    } catch (e) {
      setError(e.message || 'Could not load the grocery list');
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => { if (user) load(); else setLoading(false); }, [user, load]);

  async function toggle(item) {
    try {
      await api.toggleGrocery(item.id, !item.checked);
      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)));
    } catch (e) {
      setStatus(e.message || 'Could not update that item');
    }
  }

  async function clearChecked() {
    try {
      await api.clearCheckedGrocery(weekStart);
      setStatus('Checked items cleared.');
      load();
    } catch (e) {
      setStatus(e.message || 'Could not clear checked items');
    }
  }

  if (!user) {
    return (
      <main className="page">
        <h1>Grocery <em>list</em></h1>
        <p className="muted">Sign in to see your grocery list.</p>
        <p><Link className="btn btn-primary" to="/login">Sign in</Link></p>
      </main>
    );
  }

  const checked = items.filter((i) => i.checked).length;
  const progress = items.length ? Math.round((checked / items.length) * 100) : 0;
  const groups = ['Fresh', 'Dairy & protein', 'Pantry'];
  const byGroup = groups.map((g) => ({ group: g, items: items.filter((i) => i.group === g) })).filter((g) => g.items.length > 0);
  const ungrouped = items.filter((i) => !groups.includes(i.group));
  if (ungrouped.length) byGroup.push({ group: 'Other', items: ungrouped });

  return (
    <main className="page grocery-page">
      <p className="section-label">(01) — Grocery list</p>
      <h1>Shop the <em>week</em></h1>
      <p className="muted">Built from your planned meals for {dayLabel(weekStart)} — {dayLabel(weekEnd)}: ingredients summed across the week and scaled to your planned servings. Check items off as you shop.</p>

      <div className="planner-nav">
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setWeekStart(addDaysStr(weekStart, -7))}>← Previous week</button>
        <strong aria-live="polite">{dayLabel(weekStart)} — {dayLabel(weekEnd)}</strong>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setWeekStart(addDaysStr(weekStart, 7))}>Next week →</button>
        <Link className="btn btn-ghost btn-small" to="/planner">Back to planner</Link>
      </div>

      {status && <p className="muted small" role="status" aria-live="polite">{status}</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
      {loading && <p role="status">Building your list…</p>}

      {!loading && items.length > 0 && (
        <GroceryVisual items={items} />
      )}

      {!loading && items.length > 0 && (
        <div className="grocery-progress" aria-label={`Shopping progress: ${checked} of ${items.length} items checked`}>
          <div className="grocery-progress-bar"><div style={{ width: `${progress}%` }} /></div>
          <p role="status" aria-live="polite">{checked} of {items.length} checked — {progress}%</p>
          <button type="button" className="btn btn-ghost btn-small" disabled={checked === 0} onClick={clearChecked}>Clear checked</button>
        </div>
      )}

      {byGroup.map(({ group, items: groupItems }) => (
        <section key={group} className="grocery-group" aria-labelledby={`grocery-${group}`}>
          <h2 id={`grocery-${group}`}>{group}</h2>
          <ul className="grocery-list">
            {groupItems.map((item) => (
              <li key={item.id} className={`grocery-row ${item.checked ? 'grocery-row--checked' : ''}`}>
                <label className="grocery-check">
                  <input type="checkbox" checked={item.checked} onChange={() => toggle(item)} aria-label={`${item.name}, ${item.quantity} ${item.unit}`} />
                  <span className="grocery-name">{item.name}</span>
                  <span className="grocery-qty">{item.quantity} {item.unit}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!loading && items.length === 0 && !error && (
        <p className="muted">Nothing on the list for this week yet — <Link to="/planner">plan a few meals</Link> and come back.</p>
      )}
    </main>
  );
}
