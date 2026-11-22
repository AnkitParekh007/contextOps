import {useCallback,useEffect,useState} from "react";

export type ThemePreference = "light"|"dark"|"system";
const KEY="contextops-theme";

function isTheme(value:string|null):value is ThemePreference {
  return value==="light"||value==="dark"||value==="system";
}
function readPreference():ThemePreference {
  if(typeof document==="undefined")return "system";
  const fromDom=document.documentElement.dataset.themePreference;
  if(isTheme(fromDom??null))return fromDom as ThemePreference;
  try{
    const stored=window.localStorage.getItem(KEY);
    if(isTheme(stored))return stored;
  }catch{/* Browsers with blocked storage still support switching during this visit. */}
  return "system";
}
function resolvedTheme(preference:ThemePreference):"light"|"dark" {
  if(preference!=="system")return preference;
  return typeof window!=="undefined"&&window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ?"dark":"light";
}
function applyTheme(preference:ThemePreference):void {
  const root=document.documentElement;
  root.dataset.themePreference=preference;
  root.dataset.theme=resolvedTheme(preference);
  root.style.colorScheme=resolvedTheme(preference);
}

export function useTheme(){
  const [preference,setPreference]=useState<ThemePreference>(readPreference);
  const [resolved,setResolved]=useState<"light"|"dark">(()=>resolvedTheme(readPreference()));

  useEffect(()=>{
    const media=window.matchMedia("(prefers-color-scheme: dark)");
    const sync=()=>{applyTheme(preference);setResolved(resolvedTheme(preference));};
    sync();
    media.addEventListener("change",sync);
    return()=>media.removeEventListener("change",sync);
  },[preference]);

  useEffect(()=>{
    const onStorage=(event:StorageEvent)=>{
      if(event.key===KEY||event.key===null)setPreference(readPreferenceFromStorage());
    };
    window.addEventListener("storage",onStorage);
    return()=>window.removeEventListener("storage",onStorage);
  },[]);

  const choose=useCallback((next:ThemePreference)=>{
    try{window.localStorage.setItem(KEY,next);}catch{/* Preference remains active in memory. */}
    applyTheme(next);
    setResolved(resolvedTheme(next));
    setPreference(next);
  },[]);

  return {preference,resolved,choose};
}
function readPreferenceFromStorage():ThemePreference {
  try{
    const stored=window.localStorage.getItem(KEY);
    return isTheme(stored) ? stored:"system";
  }catch{return "system";}
}
