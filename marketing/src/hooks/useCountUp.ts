import {useEffect,useRef,useState} from "react";

export function useCountUp(target:number,duration=580):number {
  const [value,setValue]=useState(target);
  const current=useRef(target);
  useEffect(()=>{
    const prefersReduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(prefersReduced||!Number.isFinite(target)){current.current=target;setValue(target);return;}
    const startValue=current.current;
    if(Math.abs(startValue-target)<0.01){setValue(target);return;}
    let raf=0;
    const started=performance.now();
    const frame=(now:number)=>{
      const fraction=Math.min(1,(now-started)/duration);
      const eased=1-Math.pow(1-fraction,3);
      const next=startValue+(target-startValue)*eased;
      current.current=next;
      setValue(next);
      if(fraction<1)raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);
    return()=>cancelAnimationFrame(raf);
  },[target,duration]);
  return value;
}
