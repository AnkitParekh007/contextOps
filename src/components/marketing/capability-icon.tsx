import {
  Layers3, Database, BrainCircuit, Calculator, FlaskConical, ShieldCheck, Route,
  BarChart3, LockKeyhole,
} from "lucide-react";
const icons = {layers:Layers3,database:Database,brain:BrainCircuit,calculator:Calculator,
  flask:FlaskConical,shield:ShieldCheck,route:Route,chart:BarChart3,lock:LockKeyhole};
export function CapabilityIcon({type,size=23}:{type:keyof typeof icons;size?:number}){
  const Icon=icons[type];return <Icon size={size} strokeWidth={1.7}/>;
}
