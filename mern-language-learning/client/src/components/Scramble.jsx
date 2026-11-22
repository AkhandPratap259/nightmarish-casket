import { useEffect, useRef, useState } from 'react';

// Text scramble reveal (D6): characters resolve left to right in stepped
// jumps from a glyph set to the final text. The full sentence is always in
// aria-label, and the final text is the initial render — with animations
// disabled (or reduced motion) the text simply stays readable.
const GLYPHS = '!<>-_\\/[]{}=+*^?#@$%&';

export default function Scramble({ text, className = '', as: Tag = 'span', speed = 26 }) {
  const [shown, setShown] = useState(text);
  const frame = useRef(0);

  useEffect(() => {
    setShown(text);
    frame.current = 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const total = text.length;
    const id = window.setInterval(() => {
      frame.current += 1;
      // Reveal one character every 2 ticks; the rest stay scrambled.
      const revealed = Math.min(total, Math.floor(frame.current / 2));
      let out = text.slice(0, revealed);
      for (let i = revealed; i < total; i += 1) {
        out += text[i] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setShown(out);
      if (revealed >= total) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed]);

  return (
    <Tag className={`scramble ${className}`} aria-label={text}>
      <span aria-hidden="true">{shown}</span>
    </Tag>
  );
}
