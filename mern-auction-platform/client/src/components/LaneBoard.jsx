import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { inr, timeLeft, CATEGORY_LABELS } from '../api';
import LotArt from './LotArt';

const LANES = [
  { key: 'ending', label: 'Ending soon', hint: 'Under 6 hours on the clock' },
  { key: 'live', label: 'Live now', hint: 'More than 6 hours to go' },
  { key: 'ended', label: 'Ended', hint: 'Winners decided' },
];

function laneOf(a, now) {
  if (a.status !== 'live') return 'ended';
  const ms = new Date(a.endsAt).getTime() - now;
  if (ms <= 0) return 'ended';
  return ms < 6 * 60 * 60 * 1000 ? 'ending' : 'live';
}

const GAP = 14;

/**
 * Kanban board (B10) with drag-and-throw cards (D3).
 * Cards are dragged by their grip: pointer drag moves the card, and on
 * release the card keeps flying with inertia, then bounces back into its
 * slot with a playful spring (F3). Dropping a card between two others in
 * the same lane reorders that lane locally — a visual arrangement only;
 * it never changes lot status, bids or server data. Keyboard and touch
 * users open lots through the card buttons; dragging is pointer-only and
 * fully optional.
 */
export default function LaneBoard({ auctions, now, onOpenLot, toggleWatch, watchBusy }) {
  const [order, setOrder] = useState({});
  const [dragId, setDragId] = useState(null);
  const [shift, setShift] = useState({});
  const [movedId, setMovedId] = useState(null);
  const cardRefs = useRef(new Map());
  const laneRefs = useRef(new Map());
  const drag = useRef(null);
  const movedTimer = useRef(null);

  function laneItems(key) {
    const base = auctions.filter((a) => laneOf(a, now) === key);
    const saved = order[key];
    if (!saved) return base;
    const byId = new Map(base.map((a) => [String(a.id), a]));
    const ordered = saved.map((id) => byId.get(String(id))).filter(Boolean);
    const seen = new Set(ordered.map((a) => String(a.id)));
    return [...ordered, ...base.filter((a) => !seen.has(String(a.id)))];
  }

  function setCardRef(id) {
    return (el) => {
      if (el) cardRefs.current.set(String(id), el);
      else cardRefs.current.delete(String(id));
    };
  }

  function applyTransform(el, x, y, rot) {
    el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
  }

  function clearDragVisuals() {
    setDragId(null);
    setShift({});
  }

  function onGripPointerDown(e, auction, laneKey, index) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = cardRefs.current.get(String(auction.id));
    const laneEl = laneRefs.current.get(laneKey);
    if (!el || !laneEl) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is a progressive enhancement; dragging still works.
    }
    drag.current = {
      id: String(auction.id),
      lane: laneKey,
      el,
      laneEl,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastT: performance.now(),
      vx: 0,
      vy: 0,
      offX: 0,
      offY: 0,
      startIndex: index,
      hoverIndex: index,
      height: el.offsetHeight,
    };
    el.style.transition = 'none';
    el.classList.add('is-dragging');
    setDragId(String(auction.id));
    setMovedId(null);
  }

  function onGripPointerMove(e) {
    const d = drag.current;
    if (!d) return;
    const t = performance.now();
    const dt = Math.max(1, t - d.lastT);
    const nx = e.clientX;
    const ny = e.clientY;
    d.vx = ((nx - d.lastX) / dt) * 16;
    d.vy = ((ny - d.lastY) / dt) * 16;
    d.lastX = nx;
    d.lastY = ny;
    d.lastT = t;
    d.offX = nx - d.startX;
    d.offY = ny - d.startY;
    applyTransform(d.el, d.offX, d.offY, d.offX * 0.03);

    // Insertion index among the siblings (cards other than the dragged one).
    const siblings = [...d.laneEl.querySelectorAll('.lane-card')].filter(
      (c) => c.dataset.id !== d.id
    );
    let h = siblings.length;
    for (let i = 0; i < siblings.length; i += 1) {
      const r = siblings[i].getBoundingClientRect();
      if (ny < r.top + r.height / 2) {
        h = i;
        break;
      }
    }
    if (h !== d.hoverIndex) {
      d.hoverIndex = h;
      const nextShift = {};
      const s = d.startIndex;
      const step = d.height + GAP;
      siblings.forEach((c, i) => {
        const fullIndex = i < s ? i : i + 1;
        if (fullIndex < s && fullIndex >= h) nextShift[c.dataset.id] = step;
        else if (fullIndex > s && fullIndex < h) nextShift[c.dataset.id] = -step;
      });
      setShift(nextShift);
    }
  }

  function settle(d, baseX, baseY) {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = d.el;
    if (reduced) {
      el.style.transition = 'none';
      applyTransform(el, 0, 0, 0);
      el.classList.remove('is-dragging');
      clearDragVisuals();
      return;
    }
    // Inertia: the card keeps flying from its release velocity, decays,
    // then springs back into its slot with a bounce.
    let x = baseX;
    let y = baseY;
    let vx = d.vx;
    let vy = d.vy;
    const started = performance.now();
    const tick = () => {
      const elapsed = performance.now() - started;
      x += vx;
      y += vy;
      vx *= 0.92;
      vy *= 0.92;
      applyTransform(el, x, y, x * 0.03);
      if ((Math.abs(vx) > 0.6 || Math.abs(vy) > 0.6) && elapsed < 450) {
        requestAnimationFrame(tick);
        return;
      }
      el.style.transition = 'transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1)';
      applyTransform(el, 0, 0, 0);
      window.setTimeout(() => {
        el.style.transition = '';
        el.style.transform = '';
        el.classList.remove('is-dragging');
        clearDragVisuals();
      }, 500);
    };
    requestAnimationFrame(tick);
  }

  function onGripPointerUp() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const el = d.el;
    const oldRect = el.getBoundingClientRect();
    let reordered = false;
    if (d.hoverIndex !== d.startIndex) {
      const items = laneItems(d.lane);
      const ids = items.map((a) => String(a.id));
      const without = ids.filter((id) => id !== d.id);
      without.splice(d.hoverIndex, 0, d.id);
      flushSync(() => {
        setOrder((prev) => ({ ...prev, [d.lane]: without }));
      });
      reordered = true;
    }
    // The card is now laid out in its (possibly new) slot. Measure where
    // that slot is and keep the card visually where the pointer left it,
    // so the inertia flight starts from the release point.
    const newRect = el.getBoundingClientRect();
    const baseX = oldRect.left - newRect.left + d.offX;
    const baseY = oldRect.top - newRect.top + d.offY;
    el.style.transition = 'none';
    applyTransform(el, baseX, baseY, baseX * 0.03);
    if (reordered) {
      setMovedId(d.id);
      if (movedTimer.current) window.clearTimeout(movedTimer.current);
      movedTimer.current = window.setTimeout(() => setMovedId(null), 650);
    }
    settle(d, baseX, baseY);
  }

  function onGripPointerCancel() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    d.vx = 0;
    d.vy = 0;
    const el = d.el;
    const oldRect = el.getBoundingClientRect();
    const baseX = d.offX;
    const baseY = d.offY;
    void oldRect;
    el.style.transition = 'none';
    applyTransform(el, baseX, baseY, 0);
    settle(d, baseX, baseY);
  }

  return (
    <div className="lane-board" role="group" aria-label="Lots by status — drag a card by its grip to rearrange its lane">
      {LANES.map((lane) => {
        const items = laneItems(lane.key);
        return (
          <section
            key={lane.key}
            className={`lane lane--${lane.key}`}
            aria-labelledby={`lane-${lane.key}-heading`}
            ref={(el) => {
              if (el) laneRefs.current.set(lane.key, el);
              else laneRefs.current.delete(lane.key);
            }}
          >
            <div className="lane-head">
              <h3 id={`lane-${lane.key}-heading`}>{lane.label}</h3>
              <span className="lane-count" aria-label={`${items.length} lot${items.length === 1 ? '' : 's'}`}>
                {items.length}
              </span>
            </div>
            <p className="lane-hint">{lane.hint}</p>
            {items.length === 0 ? (
              <p className="lane-empty">
                {lane.key === 'ended'
                  ? 'No ended lots on this page yet.'
                  : lane.key === 'ending'
                    ? 'Nothing ending soon on this page — the clock is quiet for now.'
                    : 'No live lots on this page. List one and it lands here.'}
              </p>
            ) : (
              <ol className="lane-list">
                {items.map((a, i) => {
                  const left = timeLeft(a.endsAt, now);
                  const live = a.status === 'live' && left;
                  const isDragging = dragId === String(a.id);
                  const isMoved = movedId === String(a.id);
                  const shiftY = shift[String(a.id)] || 0;
                  return (
                    <li
                      key={a.id}
                      data-id={String(a.id)}
                      ref={setCardRef(a.id)}
                      className={`lane-card${isDragging ? ' is-dragging' : ''}${isMoved ? ' lane-card--just-moved' : ''}`}
                      style={shiftY && !isDragging ? { transform: `translateY(${shiftY}px)` } : undefined}
                    >
                      <div
                        className="lane-grip"
                        aria-hidden="true"
                        onPointerDown={(e) => onGripPointerDown(e, a, lane.key, i)}
                        onPointerMove={onGripPointerMove}
                        onPointerUp={onGripPointerUp}
                        onPointerCancel={onGripPointerCancel}
                      />
                      <button type="button" className="lane-card-main" onClick={() => onOpenLot(a.id)} aria-label={`Open ${a.title}`}>
                        <span className="lane-card-art" style={{ viewTransitionName: `lot-art-${a.id}` }}>
                          <LotArt title={a.title} category={a.category} label={CATEGORY_LABELS[a.category]} />
                        </span>
                        <span className="lane-card-body">
                          <span className="lane-card-title" style={{ viewTransitionName: `lot-title-${a.id}` }}>{a.title}</span>
                          <span className="lane-card-meta">
                            {CATEGORY_LABELS[a.category]} · {a.city} · {a.bidsCount} bid{a.bidsCount === 1 ? '' : 's'}
                            {a.status === 'ended' && a.winner ? ` · won by ${a.winner.name}` : ''}
                          </span>
                        </span>
                      </button>
                      <span className="lane-card-foot">
                        <span>
                          <span className="lane-price" key={a.currentBid}>{inr(a.currentBid)}</span>
                          <span className="lane-next">next {inr(a.minNextBid)}</span>
                        </span>
                        <span className={`lane-time ${live && left && left.length <= 4 ? 'is-urgent-text' : ''}`}>
                          {live ? left : a.status === 'ended' ? 'Ended' : 'Closed'}
                        </span>
                      </span>
                      <span className="lane-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-small"
                          onClick={() => onOpenLot(a.id)}
                          disabled={!live}
                        >
                          {live ? 'Bid now' : 'View lot'}
                        </button>
                        <button
                          type="button"
                          className="watch-btn"
                          onClick={() => toggleWatch(a)}
                          disabled={watchBusy[a.id]}
                          aria-pressed={Boolean(a.watched)}
                          aria-label={a.watched ? `Stop watching ${a.title}` : `Watch ${a.title}`}
                        >
                          {a.watched ? '★ Watching' : '☆ Watch'}
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}
