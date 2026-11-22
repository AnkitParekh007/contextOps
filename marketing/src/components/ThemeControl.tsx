import {useEffect,useRef,useState} from "react";
import {Check,ChevronDown,Monitor,Moon,Sun} from "lucide-react";
import {useTheme,type ThemePreference} from "../hooks/useTheme";

const choices=[
  {value:"light" as const,label:"Light",Icon:Sun},
  {value:"dark" as const,label:"Dark",Icon:Moon},
  {value:"system" as const,label:"System",Icon:Monitor},
];
export function ThemeControl(){
  const {preference,resolved,choose}=useTheme();
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false);};
    const keyboard=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);root.current?.querySelector("button")?.focus();}};
    document.addEventListener("pointerdown",outside);
    document.addEventListener("keydown",keyboard);
    return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",keyboard);};
  },[open]);

  return <div className="theme-control" ref={root}>
    <button type="button" className="theme-trigger" aria-label={"Theme: "+preference+". Choose appearance"}
      aria-expanded={open} aria-controls="theme-options" aria-haspopup="true"
      onClick={()=>setOpen(v=>!v)} title={"Appearance: "+preference}>
      {resolved==="dark"?<Moon size={18}/>:<Sun size={18}/>}
      <span className="theme-trigger-text">{preference==="system"?"Auto":preference==="dark"?"Dark":"Light"}</span>
      <ChevronDown size={13} className={open?"turned":""}/>
    </button>
    {open&&<div id="theme-options" className="theme-menu" role="group" aria-label="Appearance settings">
      <p className="theme-menu-label">APPEARANCE</p>
      {choices.map(({value,label,Icon})=><button key={value} type="button" className={"theme-option"+(preference===value?" selected":"")}
        aria-pressed={preference===value} onClick={()=>{choose(value as ThemePreference);setOpen(false);}}>
        <Icon size={17}/><span>{label}</span>{preference===value&&<Check size={15}/>}
      </button>)}
      <p className="theme-menu-foot">System follows your device settings.</p>
    </div>}
  </div>;
}
