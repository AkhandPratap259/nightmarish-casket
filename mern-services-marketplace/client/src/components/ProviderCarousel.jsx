import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// D19: CSS 3D coverflow carousel of provider cards. The active provider
// sits front-centre; neighbours tilt away in 3D. Buttons, arrow keys and
// swipe/drag all rotate it. Non-active cards are inert (tabIndex -1) so
// keyboard users only ever tab into the card they can see.
export default function ProviderCarousel({ providers }) {
  const count = providers.length;
  const [index, setIndex] = useState(0);
  const dragRef = useRef({ startX: 0, dragging: false, moved: false });

  const go = useCallback(
    (dir) => {
      if (!count) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count]
  );

  // Wrap an offset into the shortest arc around the active card.
  function offsetFor(i) {
    let off = i - index;
    if (off > count / 2) off -= count;
    if (off < -count / 2) off += count;
    return off;
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    }
  }

  function onPointerDown(e) {
    dragRef.current = { startX: e.clientX, dragging: true, moved: false };
  }
  function onPointerMove(e) {
    if (!dragRef.current.dragging) return;
    if (Math.abs(e.clientX - dragRef.current.startX) > 12) dragRef.current.moved = true;
  }
  function onPointerUp(e) {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    dragRef.current.dragging = false;
    if (dx < -60) go(1);
    else if (dx > 60) go(-1);
  }

  // Keep the index valid if the provider list shrinks.
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (!count) return null;

  return (
    <div className="carousel-3d">
      <div
        className="carousel-stage"
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured providers — use the arrow buttons or swipe to browse"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {providers.map((p, i) => {
          const off = offsetFor(i);
          const abs = Math.abs(off);
          const active = off === 0;
          return (
            <article
              key={p._id}
              className="carousel-card"
              aria-hidden={!active}
              style={{
                transform: `translateX(calc(${off} * var(--carousel-spread, 215px))) translateZ(${-abs * 130}px) rotateY(${off * -32}deg)`,
                opacity: abs === 0 ? 1 : abs === 1 ? 0.75 : 0.35,
                zIndex: 10 - abs,
                pointerEvents: active ? 'auto' : 'none',
              }}
            >
              <span className="avatar" style={{ backgroundColor: p.avatarColor }} aria-hidden="true">
                {p.name.charAt(0)}
              </span>
              <strong>{p.name}</strong>
              <span className="muted">{p.city} · {p.yearsExperience} yrs experience</span>
              <span className="provider-stats">
                ★ {p.stats?.rating ?? '—'} ({p.stats?.reviewCount ?? 0} reviews) · {p.stats?.completedJobs ?? 0} jobs done
              </span>
              <Link
                className="btn btn-ghost btn-small"
                to={`/providers/${p._id}`}
                tabIndex={active ? 0 : -1}
              >
                View profile
              </Link>
            </article>
          );
        })}
      </div>
      <div className="carousel-nav">
        <button
          type="button"
          className="carousel-arrow"
          onClick={() => go(-1)}
          aria-label="Previous provider"
        >
          ←
        </button>
        <div className="carousel-dots" role="group" aria-label="Choose a provider">
          {providers.map((p, i) => (
            <button
              key={p._id}
              type="button"
              className={`carousel-dot ${i === index ? 'carousel-dot--active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Show ${p.name}`}
              aria-current={i === index ? 'true' : undefined}
            />
          ))}
        </div>
        <button
          type="button"
          className="carousel-arrow"
          onClick={() => go(1)}
          aria-label="Next provider"
        >
          →
        </button>
      </div>
      <p className="carousel-hint">Drag, swipe, or use ← → keys to spin the pinboard.</p>
    </div>
  );
}
