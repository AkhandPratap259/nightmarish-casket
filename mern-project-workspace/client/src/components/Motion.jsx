import { useEffect, useRef } from 'react';

export function MotionToggle({ motion, setMotion }) {
  return <button className="motion-toggle" type="button" aria-pressed={motion} onClick={() => setMotion(!motion)}><span className={`motion-track ${motion ? 'on' : ''}`} aria-hidden="true"><i/></span><span>Motion {motion ? 'on' : 'off'}</span></button>;
}

export function KineticHeading({ lines, motion }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!motion || !el || !matchMedia('(pointer:fine)').matches) return;
    let frame = 0;
    const letters = [...el.querySelectorAll('.kinetic-letter')];
    const move = e => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => letters.forEach(letter => {
        const r = letter.getBoundingClientRect(), dx = e.clientX - r.x - r.width / 2, dy = e.clientY - r.y - r.height / 2;
        const influence = Math.max(0, 1 - Math.hypot(dx, dy) / 180);
        letter.style.setProperty('--lift', `${-12 * influence}px`);
        letter.style.setProperty('--turn', `${dx * influence * .045}deg`);
      }));
    };
    const reset = () => {cancelAnimationFrame(frame);letters.forEach(l => {l.style.removeProperty('--lift');l.style.removeProperty('--turn');});};
    el.addEventListener('pointermove', move); el.addEventListener('pointerleave', reset);
    return () => { el.removeEventListener('pointermove', move);el.removeEventListener('pointerleave', reset);reset(); };
  }, [motion]);
  return <h1 ref={ref} className="kinetic-heading" aria-label={lines.join(' ')}>{lines.map((line, j) => <span className={`kinetic-line line-${j}`} key={j} aria-hidden="true">{[...line].map((c,i)=><span className="kinetic-letter" key={i} style={{'--delay':`${(i+j*8)*30}ms`}}>{c === ' ' ? '\u00a0' : c}</span>)}</span>)}</h1>;
}

export function useMotionEffects(enabled) {
  useEffect(() => {
    document.documentElement.dataset.motion = enabled ? 'on' : 'off';
    if (!enabled || !matchMedia('(pointer:fine)').matches) return;
    let target = null, frame = 0;
    const reset = () => {if(target){target.style.removeProperty('--mx');target.style.removeProperty('--my');target.style.removeProperty('--rx');target.style.removeProperty('--ry');target=null;}};
    const move = e => {
      if(e.buttons) {reset();return;}
      const next = e.target instanceof Element ? e.target.closest('.magnetic, .card') : null;
      if (target !== next) {reset();target=next;}
      if (!target) return;
      const el=target; cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        if(target!==el)return;
        const r=el.getBoundingClientRect(), x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
        el.style.setProperty('--mx',`${x*6}px`);el.style.setProperty('--my',`${y*5}px`);
        el.style.setProperty('--rx',`${-y*3}deg`);el.style.setProperty('--ry',`${x*3}deg`);
      });
    };
    document.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerdown',reset);document.addEventListener('pointerleave',reset);window.addEventListener('blur',reset);
    return ()=>{cancelAnimationFrame(frame);reset();document.removeEventListener('pointermove',move);document.removeEventListener('pointerdown',reset);document.removeEventListener('pointerleave',reset);window.removeEventListener('blur',reset);};
  },[enabled]);
}
