import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, addDaysStr, dayLabel, weekStartStr } from '../api';
import { SLOTS } from '../data/content';
import Dialog from '../components/Dialog';

export default function Planner({ user }) {
  const [weekStart, setWeekStart] = useState(() => weekStartStr());
  const [entries, setEntries] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [dragOver, setDragOver] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [slotDialog, setSlotDialog] = useState(null); // {date, slot, entry?}
  const [dialogServings, setDialogServings] = useState(4);
  const [deckDay, setDeckDay] = useState(0);
  const touchX = useRef(null);

  function onDeckTouchStart(e) {
    touchX.current = e.changedTouches[0].clientX;
  }
  function onDeckTouchEnd(e) {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (dx < -48) setDeckDay((d) => Math.min(6, d + 1));
    else if (dx > 48) setDeckDay((d) => Math.max(0, d - 1));
  }

  const weekEnd = addDaysStr(weekStart, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDaysStr(weekStart, i));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plan, rec] = await Promise.all([
        api.listPlan(weekStart, weekEnd),
        api.listRecipes({ limit: 50, sort: 'newest' }),
      ]);
      setEntries(plan.entries || []);
      setRecipes(rec.recipes || []);
    } catch (e) {
      setError(e.message || 'Could not load the planner');
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => { if (user) load(); else setLoading(false); }, [user, load]);

  function entryFor(date, slot) {
    return entries.find((e) => e.date === date && e.slot === slot);
  }

  async function assignRecipe(date, slot, recipeId, servings) {
    try {
      await api.addPlan({ date, slot, recipeId, servings });
      setStatus('Meal planned.');
      load();
    } catch (e) {
      setStatus(e.message || 'Could not plan that meal');
    }
  }

  async function moveEntry(entryId, date, slot) {
    try {
      await api.movePlan(entryId, { date, slot });
      setStatus('Meal moved.');
      load();
    } catch (e) {
      setStatus(e.message || 'Could not move that meal');
    }
  }

  async function removeEntry(entryId) {
    try {
      await api.removePlan(entryId);
      setStatus('Meal removed from the plan.');
      setSlotDialog(null);
      load();
    } catch (e) {
      setStatus(e.message || 'Could not remove that meal');
    }
  }

  function onDrop(e, date, slot) {
    e.preventDefault();
    setDragOver('');
    const recipeId = e.dataTransfer.getData('text/recipe');
    const entryId = e.dataTransfer.getData('text/entry');
    if (recipeId) assignRecipe(date, slot, recipeId, 4);
    else if (entryId) moveEntry(entryId, date, slot);
  }

  function openSlot(date, slot) {
    const entry = entryFor(date, slot);
    setDialogServings(entry ? entry.servings : 4);
    setSlotDialog({ date, slot, entry: entry || null });
  }

  if (!user) {
    return (
      <main className="page">
        <h1>Week <em>planner</em></h1>
        <p className="muted">Sign in to plan your week.</p>
        <p><Link className="btn btn-primary" to="/login">Sign in</Link></p>
      </main>
    );
  }

  return (
    <main className="page planner-page">
      <p className="section-label">(01) — Meal planner</p>
      <h1>Plan the <em>week</em></h1>
      <p className="muted">Drag a recipe from the list onto a slot — or tap a recipe, then tap a slot. Drag a planned meal between slots to move it. Click any slot to change servings or remove it.</p>

      <div className="planner-nav">
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setWeekStart(addDaysStr(weekStart, -7))}>← Previous week</button>
        <strong aria-live="polite">{dayLabel(weekStart)} — {dayLabel(weekEnd)}</strong>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setWeekStart(addDaysStr(weekStart, 7))}>Next week →</button>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setWeekStart(weekStartStr())}>This week</button>
        <Link className="btn btn-primary btn-small" to="/grocery">Generate grocery list →</Link>
      </div>
      {status && <p className="muted small" role="status" aria-live="polite">{status}</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
      {loading && <p role="status">Loading the week…</p>}

      <div className="planner-layout">
        <aside className="planner-recipes" aria-label="Recipes to drag onto the planner">
          <h2>Recipes</h2>
          <p className="muted small">Drag one onto a slot, or tap to select then tap a slot.</p>
          <ul className="planner-recipe-list">
            {recipes.map((r) => (
              <li key={r._id}>
                <button
                  type="button"
                  className={`planner-recipe-chip ${selectedRecipe === r._id ? 'planner-recipe-chip--selected' : ''}`}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/recipe', r._id); e.dataTransfer.effectAllowed = 'copy'; }}
                  onClick={() => setSelectedRecipe(selectedRecipe === r._id ? null : r._id)}
                  aria-pressed={selectedRecipe === r._id}
                >
                  <strong>{r.title}</strong>
                  <span className="muted small">{r.cuisine} · {r.prepTimeMin + r.cookTimeMin} min</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="planner-grid" role="grid" aria-label="Week plan">
          <div className="planner-head-row" role="row">
            <span className="planner-corner" />
            {days.map((d) => (
              <span key={d} className="planner-day-head" role="columnheader">{dayLabel(d)}</span>
            ))}
          </div>
          {SLOTS.map((slot) => (
            <div key={slot.value} className="planner-slot-row" role="row">
              <span className="planner-slot-label">{slot.label}</span>
              {days.map((d) => {
                const entry = entryFor(d, slot.value);
                const key = `${d}:${slot.value}`;
                return (
                  <button
                    key={key}
                    type="button"
                    role="gridcell"
                    aria-label={`${dayLabel(d)} ${slot.label}${entry ? `: ${entry.recipe?.title}, ${entry.servings} servings` : ': empty'}`}
                    className={`planner-cell ${entry ? 'planner-cell--filled' : ''} ${dragOver === key ? 'planner-cell--dragover' : ''}`}
                    onClick={() => {
                      if (selectedRecipe && !entry) {
                        assignRecipe(d, slot.value, selectedRecipe, 4);
                        setSelectedRecipe(null);
                      } else {
                        openSlot(d, slot.value);
                      }
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(key); }}
                    onDragLeave={() => setDragOver((v) => (v === key ? '' : v))}
                    onDrop={(e) => onDrop(e, d, slot.value)}
                  >
                    {entry ? (
                      <span
                        className="planner-entry"
                        draggable
                        onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData('text/entry', entry.id); e.dataTransfer.effectAllowed = 'move'; }}
                      >
                        <strong>{entry.recipe?.title || 'Recipe'}</strong>
                        <em>{entry.servings} servings</em>
                      </span>
                    ) : (
                      <span className="planner-empty">+ Add</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Card-deck view (B15 accent layout): one day per card, swipe or tap
          through the week. Shown on small screens; the grid above is desktop. */}
      <div className="planner-deck" aria-label="Week plan, one day at a time">
        <div
          className="planner-deck-card"
          key={days[deckDay]}
          onTouchStart={onDeckTouchStart}
          onTouchEnd={onDeckTouchEnd}
        >
          <p className="section-label">Day {deckDay + 1} of 7 — swipe to change day</p>
          <h2>{dayLabel(days[deckDay])}</h2>
          <p className="muted small">Tap a slot to add, change servings or remove a meal.</p>
          <ul className="planner-deck-slots">
            {SLOTS.map((slot) => {
              const entry = entryFor(days[deckDay], slot.value);
              return (
                <li key={slot.value}>
                  <button
                    type="button"
                    className={`planner-deck-slot ${entry ? 'planner-deck-slot--filled' : ''}`}
                    aria-label={`${dayLabel(days[deckDay])} ${slot.label}${entry ? `: ${entry.recipe?.title}, ${entry.servings} servings` : ': empty'}`}
                    onClick={() => {
                      if (selectedRecipe && !entry) {
                        assignRecipe(days[deckDay], slot.value, selectedRecipe, 4);
                        setSelectedRecipe(null);
                      } else {
                        openSlot(days[deckDay], slot.value);
                      }
                    }}
                  >
                    <span className="planner-deck-slot-label">{slot.label}</span>
                    {entry ? (
                      <span><strong>{entry.recipe?.title || 'Recipe'}</strong> <span className="muted small">· {entry.servings} servings</span></span>
                    ) : (
                      <span className="planner-empty">+ Add a meal</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="planner-deck-nav">
          <button type="button" className="btn btn-ghost" disabled={deckDay === 0} onClick={() => setDeckDay((d) => Math.max(0, d - 1))} aria-label="Previous day">← Prev day</button>
          <span className="planner-deck-dots" role="tablist" aria-label="Choose a day">
            {days.map((d, i) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={deckDay === i}
                aria-label={dayLabel(d)}
                className={`planner-deck-dot ${deckDay === i ? 'planner-deck-dot--active' : ''}`}
                onClick={() => setDeckDay(i)}
              />
            ))}
          </span>
          <button type="button" className="btn btn-ghost" disabled={deckDay === 6} onClick={() => setDeckDay((d) => Math.min(6, d + 1))} aria-label="Next day">Next day →</button>
        </div>
      </div>

      <Dialog open={!!slotDialog} onClose={() => setSlotDialog(null)} title={slotDialog ? `${dayLabel(slotDialog.date)} — ${slotDialog.slot}` : ''}>
        {slotDialog?.entry ? (
          <>
            <p><strong>{slotDialog.entry.recipe?.title}</strong> · {slotDialog.entry.servings} servings</p>
            <div className="field">
              <label htmlFor="slot-servings">Servings</label>
              <input id="slot-servings" type="number" min="1" max="24" value={dialogServings} onChange={(e) => setDialogServings(Number(e.target.value))} />
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={() => removeEntry(slotDialog.entry.id)}>Remove from plan</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    await api.movePlan(slotDialog.entry.id, { date: slotDialog.date, slot: slotDialog.slot, servings: dialogServings });
                    setStatus('Servings updated.');
                    setSlotDialog(null);
                    load();
                  } catch (e) {
                    setStatus(e.message || 'Could not update servings');
                  }
                }}
              >
                Save servings
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">Pick a recipe for this slot.</p>
            <ul className="dialog-list">
              {recipes.map((r) => (
                <li key={r._id}>
                  <button type="button" className="btn btn-ghost dialog-list-btn" onClick={() => { assignRecipe(slotDialog.date, slotDialog.slot, r._id, dialogServings); setSlotDialog(null); }}>
                    {r.title} · {r.cuisine}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Dialog>
    </main>
  );
}
