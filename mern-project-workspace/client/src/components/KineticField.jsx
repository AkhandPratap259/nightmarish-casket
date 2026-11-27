import { useEffect, useRef } from 'react';

const EMPTY_TASKS = [];
const COLORS = { todo:'#5b4bc4', 'in-progress':'#c40e6e', review:'#b8860b', done:'#0e7c74' };
const STATES = Object.keys(COLORS);
const TAU = Math.PI*2;
const blend = (a,b,t) => a+(b-a)*t;
const smooth = t => t*t*(3-2*t);

// Continuous particle morphs use the same particle identities between formations.
// Task refreshes update their targets without restarting the animation.
export default function KineticField({ tasks = EMPTY_TASKS, motion, hero = false }) {
  const ref=useRef(null), data=useRef(tasks), redraw=useRef(null);
  data.current=tasks;
  useEffect(()=>{
    const canvas=ref.current, parent=canvas?.parentElement, ctx=canvas?.getContext('2d');
    if(!ctx || !parent)return;
    let frame=0,w=0,h=0,last=0,visible=true,clock=0,previous=0;
    let pointer={x:-1000,y:-1000};
    const preference=matchMedia('(prefers-reduced-motion: reduce)');
    const enabled=()=>motion&&!preference.matches;
    const dots=new Map();
    const sync=()=>{
      const current=hero?Array.from({length:84},(_,i)=>({id:`hero-${i}`,color:i%4===0?'#ff5ea8':i%4===1?'#2fd4c4':i%4===2?'#5b4bc4':'#ffd166',status:STATES[i%4]})):data.current.slice(0,100).map((task,i)=>({id:task._id||`task-${i}`,color:COLORS[task.status]||COLORS.todo,status:task.status}));
      // Decorative anchors remain even when a board has no tasks; real task dots retain status colours.
      if(!hero)for(let i=0;i<48;i++)current.push({id:`anchor-${i}`,color:i%4===0?'#ff5ea8':i%4===1?'#2fd4c4':i%4===2?'#5b4bc4':'#ffd166',status:STATES[i%4],anchor:true});
      const keys=new Set(current.map(d=>d.id));
      for(const key of dots.keys())if(!keys.has(key))dots.delete(key);
      current.forEach((d,i)=>{
        const old=dots.get(d.id);
        if(old)Object.assign(old,d,{index:i});
        else dots.set(d.id,{...d,index:i,x:((i*73+11)%101)/100*w,y:((i*37+17)%101)/100*h});
      });
    };
    const target=(d,shape)=>{
      const i=d.index, angle=i*2.399963, frac=((i*37+17)%101)/100, size=Math.min(w,h);
      if(hero){
        const cx=w*.77,cy=h*.38,rad=Math.min(size*.29,w*.2);
        if(shape===0){const a=i/84*TAU;const ring=.52+(i%3)*.23;return [cx+Math.cos(a)*rad*ring,cy+Math.sin(a)*rad*ring*.72];}
        if(shape===1){ // Up-right arrow, matching the existing FlowBoard mark.
          const v=i/83;const p=v<.52?v/.52:(v<.76?(v-.52)/.24:(v-.76)/.24);
          if(v<.52)return [cx+blend(-.75,.65,p)*rad,cy+blend(.75,-.65,p)*rad];
          if(v<.76)return [cx+blend(-.05,.65,p)*rad,cy-.65*rad];
          return [cx+.65*rad,cy+blend(-.65,.05,p)*rad];
        }
        const col=i%7,row=Math.floor(i/7)%12;return [cx+(col-3)*rad*.24,cy+(row-5.5)*rad*.145];
      }
      const lane=Math.max(0,STATES.indexOf(d.status)), margin=Math.min(24,w*.04);
      if(shape===0)return [margin+((i*73+11)%101)/100*(w-2*margin),margin+frac*(h-2*margin)];
      if(shape===1)return [(lane+.5)*w/4+Math.cos(angle)*Math.min(w*.083,50)*Math.sqrt(frac),h*.5+Math.sin(angle)*Math.min(h*.29,120)*Math.sqrt(frac)];
      return [margin+((i%24)/23)*(w-2*margin),h*(.1+.8*((Math.floor(i/24)%6)/5))];
    };
    const paint=(dt=0)=>{
      if(!w||!h)return;
      sync();ctx.clearRect(0,0,w,h);
      const period=4800,phase=enabled()?clock/period:0,shape=Math.floor(phase)%3,next=(shape+1)%3;
      const morph=smooth(Math.max(0,Math.min(1,(phase%1-.48)/.52)));
      if(hero){ctx.save();ctx.translate(w*.77,h*.38);ctx.strokeStyle='rgba(196,14,110,.19)';ctx.lineWidth=1;for(let i=0;i<6;i++){ctx.beginPath();ctx.ellipse(0,0,Math.min(w,h)*(.09+i*.036),Math.min(w,h)*(.07+i*.029),-.45+Math.sin(clock*.00025)*.15,0,TAU);ctx.stroke();}ctx.restore();}
      const follow=enabled()?1-Math.exp(-Math.max(1,dt)/115):1;
      for(const d of dots.values()){
        const a=target(d,shape),b=target(d,next);
        let tx=blend(a[0],b[0],morph),ty=blend(a[1],b[1],morph);
        if(enabled()){
          tx+=Math.sin(clock*.0009+d.index)*2.8;ty+=Math.cos(clock*.0007+d.index)*2.8;
          const dx=tx-pointer.x,dy=ty-pointer.y,dist=Math.hypot(dx,dy);
          if(dist<95&&dist>0){tx+=dx/dist*(95-dist)*.38;ty+=dy/dist*(95-dist)*.38;}
        }
        d.x=blend(d.x,tx,follow);d.y=blend(d.y,ty,follow);
        ctx.globalAlpha=hero ? .48 : d.anchor ? .16 : .35;ctx.fillStyle=d.color;ctx.beginPath();ctx.arc(d.x,d.y,hero?1.8:d.anchor?1.3:2.4,0,TAU);ctx.fill();
      }
      ctx.globalAlpha=1;
    };
    const resize=()=>{w=parent.clientWidth;h=parent.clientHeight;const dpr=Math.min(devicePixelRatio||1,1.5,4096/Math.max(w,h,1));canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);paint(16);};
    const tick=t=>{frame=0;if(!enabled()||!visible||document.hidden)return;if(t-last>=32){const dt=previous?Math.min(t-previous,70):33;clock+=dt;previous=t;last=t;paint(dt);}frame=requestAnimationFrame(tick);};
    const refresh=()=>{cancelAnimationFrame(frame);frame=0;previous=0;if(enabled()&&visible&&!document.hidden)frame=requestAnimationFrame(tick);else paint(0);};
    const ro=new ResizeObserver(resize);ro.observe(parent);resize();
    const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;refresh();});observer.observe(parent);
    const move=e=>{const r=parent.getBoundingClientRect();pointer={x:e.clientX-r.left,y:e.clientY-r.top};};const leave=()=>{pointer={x:-1000,y:-1000};};
    parent.addEventListener('pointermove',move,{passive:true});parent.addEventListener('pointerleave',leave);document.addEventListener('visibilitychange',refresh);preference.addEventListener('change',refresh);redraw.current=()=>{if(!enabled()||!visible||document.hidden)paint(0);};refresh();
    return ()=>{redraw.current=null;cancelAnimationFrame(frame);ro.disconnect();observer.disconnect();parent.removeEventListener('pointermove',move);parent.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',refresh);preference.removeEventListener('change',refresh);};
  },[motion,hero]);
  // A motion-disabled canvas must still reflect changed task data.
  useEffect(()=>{redraw.current?.();},[tasks]);
  return <canvas className="kinetic-field" ref={ref} aria-hidden="true"/>;
}
