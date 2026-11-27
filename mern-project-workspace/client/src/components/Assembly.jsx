import { useEffect, useRef } from 'react';

const ease = x => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
const mix = (a,b,t) => a+(b-a)*t;
const palette = ['#e67b43','#b79c72','#81796e','#74977d'];

// Decorative only: never intercepts input, modifies data or delays mounting.
export default function Assembly({ motion, scene, drawer }) {
  const ref = useRef(null);
  const previous = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const before = previous.current;
    previous.current = { scene, drawer, motion };
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    if (!motion || preference.matches || document.hidden) return;
    // Closing a drawer or re-enabling motion does not replay the workspace.
    if (before && before.scene === scene && !drawer && (before.drawer || !before.motion)) return;
    let frame = 0, stopped = false, animations = [], points = [], width = 0, height = 0;
    const stop = () => {
      stopped = true; cancelAnimationFrame(frame);
      animations.forEach(a => a.cancel()); animations = [];
      ctx.clearRect(0,0,width,height);
    };
    const change = () => { if (preference.matches || document.hidden) stop(); };
    preference.addEventListener('change', change);
    document.addEventListener('visibilitychange', change);
    window.addEventListener('resize', stop);
    window.addEventListener('scroll', stop, {capture:true, passive:true});
    frame = requestAnimationFrame(() => {
      if (stopped) return;
      width = window.innerWidth; height = window.innerHeight;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const selectors = drawer ? ['.modal'] : scene === 'auth' ? ['.auth-intro','.auth-card'] : ['.board-head','.metric-strip','.column','.bottom-panels .panel','.empty-project'];
      const nodes = [...document.querySelectorAll(selectors.join(','))].filter(el => {
        const r=el.getBoundingClientRect(); return r.width>0 && r.height>0 && (drawer || (r.bottom>0 && r.top<height && r.right>0 && r.left<width));
      }).slice(0,8);
      const mobile = width < 800;
      nodes.forEach((el,index) => {
        const raw=el.getBoundingClientRect();
        // Drawer is already sliding in; use its final viewport position.
        const l=drawer ? Math.max(0,width-el.offsetWidth) : Math.max(0,raw.left);
        const r=drawer ? width : Math.min(width,raw.right);
        const t=drawer ? 0 : Math.max(0,raw.top), b=drawer ? height : Math.min(height,raw.bottom);
        if(r-l<10 || b-t<10) return;
        const delay=Math.min(index*54,216), duration=500;
        if (!drawer && typeof el.animate === 'function') {
          // Clip the entrance in place; do not interfere with drag or canvas transforms.
          animations.push(el.animate([
            {clipPath:'inset(0 0 14% 0)',opacity:.72},
            {clipPath:'inset(0 0 0 0)',opacity:1}
          ],{duration,delay,easing:'cubic-bezier(.2,.8,.2,1)',fill:'none'}));
        }
        const count=mobile?12:24;
        for(let i=0;i<count;i++){
          const u=i/count*4, side=Math.floor(u), f=u-side;
          const x=side===0?mix(l,r,f):side===1?r:side===2?mix(r,l,f):l;
          const y=side===0?t:side===1?mix(t,b,f):side===2?b:mix(b,t,f);
          const angle=i*2.399963+index*.6, spread=45+(i%7)*14;
          points.push({x,y,sx:x+Math.cos(angle)*spread,sy:y+Math.sin(angle)*spread,delay:delay+(i%5)*12,color:palette[(i+index)%4],radius:i%5===0?2.2:1.25});
        }
      });
      const start=performance.now();
      const paint=now=>{
        if(stopped) return;
        const elapsed=now-start;ctx.clearRect(0,0,width,height);
        for(const p of points){
          const local=elapsed-p.delay;if(local<0||local>700)continue;
          const q=ease(local/490), x=mix(p.sx,p.x,q), y=mix(p.sy,p.y,q);
          ctx.globalAlpha=Math.min(1,local/65)*Math.max(0,1-(Math.max(0,local-420)/280))*.78;
          ctx.fillStyle=p.color;ctx.fillRect(x,y,p.radius*2,p.radius*2);
          if(local<440){ctx.strokeStyle=p.color;ctx.lineWidth=.75;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(mix(p.sx,p.x,ease((local-32)/490)),mix(p.sy,p.y,ease((local-32)/490)));ctx.stroke();}
        }
        ctx.globalAlpha=1;
        if(elapsed<1000)frame=requestAnimationFrame(paint);else ctx.clearRect(0,0,width,height);
      };
      frame=requestAnimationFrame(paint);
    });
    return ()=>{stop();preference.removeEventListener('change',change);document.removeEventListener('visibilitychange',change);window.removeEventListener('resize',stop);window.removeEventListener('scroll',stop,true);};
  },[motion,scene,drawer]);
  return <canvas className="assembly-particles" ref={ref} aria-hidden="true"/>;
}
