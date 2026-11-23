import { useEffect, useRef } from 'react';

// FLIP reorder: when the list of items changes (filter/sort), each item
// animates from its old position to its new one instead of jumping.
export default function FlipList({ items, renderItem, itemKey }) {
  const listRef = useRef(null);
  const prevPositions = useRef(new Map());

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const nextPositions = new Map();
    for (const child of list.children) {
      const key = child.dataset.flipKey;
      if (key) nextPositions.set(key, child.getBoundingClientRect().top);
    }
    for (const child of list.children) {
      const key = child.dataset.flipKey;
      const prev = prevPositions.current.get(key);
      const next = nextPositions.get(key);
      if (prev !== undefined && next !== undefined && prev !== next) {
        const delta = prev - next;
        child.animate(
          [
            { transform: `translateY(${delta}px)` },
            { transform: 'translateY(0)' },
          ],
          { duration: 320, easing: 'steps(8, end)' }
        );
      }
    }
    prevPositions.current = nextPositions;
  }, [items]);

  return (
    <div ref={listRef} className="flip-list">
      {items.map((item) => (
        <div key={itemKey(item)} data-flip-key={itemKey(item)} className="flip-list__item">
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}
