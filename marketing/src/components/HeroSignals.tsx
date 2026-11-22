import {useId} from "react";

/** Decorative motion field that visualizes evidence flowing through a gate. */
export function HeroSignals(){
  const id=useId().replace(/[^a-zA-Z0-9]/g,"");
  const p1=id+"-first",p2=id+"-second";
  return <div className="hero-signal-field" aria-hidden="true">
    <span className="signal-halo halo-one"/><span className="signal-halo halo-two"/>
    <svg viewBox="0 0 540 440" preserveAspectRatio="xMidYMid meet" focusable="false">
      <defs>
        <linearGradient id={id+"-g"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7FA3EC" stopOpacity="0"/>
          <stop offset="50%" stopColor="#7FA3EC" stopOpacity=".6"/>
          <stop offset="100%" stopColor="#7498C7" stopOpacity=".2"/>
        </linearGradient>
      </defs>
      <path id={p1} d="M 2 96 C 145 96, 164 210, 298 210 S 419 150, 538 150"
        stroke={"url(#"+id+"-g)"} strokeWidth="1.6" strokeDasharray="6 9" fill="none"/>
      <path id={p2} d="M 2 344 C 150 344, 158 238, 298 238 S 410 300, 538 300"
        stroke={"url(#"+id+"-g)"} strokeWidth="1.5" strokeDasharray="6 9" fill="none"/>
      {[p1,p2].map((path,i)=><g key={path} className="signal-moving-particles">
        <circle r="4" fill="#85A8EE">
          <animateMotion dur={(i?5.8:4.8)+"s"} begin={i?"-2s":"0s"} repeatCount="indefinite">
            <mpath href={"#"+path}/>
          </animateMotion>
        </circle>
        <circle r="2.7" fill="#8CAFDD">
          <animateMotion dur={(i?5.8:4.8)+"s"} begin="-2.7s" repeatCount="indefinite">
            <mpath href={"#"+path}/>
          </animateMotion>
        </circle>
      </g>)}
      <g className="signal-static-particles" fill="#85A8EE"><circle cx="70" cy="110" r="3"/><circle cx="467" cy="154" r="3"/><circle cx="126" cy="330" r="3"/></g>
    </svg>
  </div>;
}
